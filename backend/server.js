import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer } from 'http';
import { runAgent, routeToAgent } from './agent.js';
import { handleWhatsAppWebhook, handleStatusCallback } from './whatsapp.js';
import {
  handleWhatsAppVoiceCall,
  handleVoiceCallStatus,
  setupMediaStreamWebSocket,
} from './whatsapp-voice.js';
import { REALTIME_CONFIG } from './voice-config.js';
import { createOrGetUser } from './database.js';
import { getConversation, saveConversation } from './supabase.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server for WebSocket support
const server = createServer(app);

// Configure multer for file uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and documents
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Twilio webhooks

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Guru backend API is running' });
});

// Phone number submission endpoint
app.post('/api/submit-phone', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Please provide a valid phone number',
      });
    }

    console.log(`📱 Received phone number submission: ${phoneNumber}`);

    // Create or get user in database
    const user = await createOrGetUser(phoneNumber);

    console.log(`✅ User created/retrieved: ${user.id}`);

    // Return success with user data
    res.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phone_number,
      },
    });
  } catch (error) {
    console.error('❌ Error processing phone number:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Main chat endpoint - now supports file uploads and conversation state
app.post('/api/chat', upload.array('files', 10), async (req, res) => {
  try {
    const { prompt, phoneNumber } = req.body;
    const files = req.files;

    if ((!prompt || typeof prompt !== 'string') && (!files || files.length === 0)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Please provide a valid prompt string or files',
      });
    }

    console.log(`\n📥 Received prompt: "${prompt}"`);
    console.log(`📱 User phone: ${phoneNumber || 'not provided'}`);
    console.log(`📎 Files attached: ${files ? files.length : 0}`);

    if (files && files.length > 0) {
      files.forEach(file => {
        console.log(`  - ${file.originalname} (${file.mimetype}, ${(file.size / 1024).toFixed(2)} KB)`);
      });
    }

    // Get existing conversation from Supabase if phone number provided
    let existingConversationId = null;
    if (phoneNumber) {
      console.log('🔍 Looking up conversation in Supabase...');
      const { conversationId, lastAgent } = await getConversation(phoneNumber);
      existingConversationId = conversationId;
      console.log(`   Existing conversation ID: ${existingConversationId || 'None'}`);
      console.log(`   Last agent used: ${lastAgent || 'None'}`);
    }

    // Route to the appropriate agent
    console.log('🔀 Routing to appropriate agent...');
    const selectedAgent = await routeToAgent(prompt);
    console.log(`✅ Selected agent: ${selectedAgent}`);

    // Run the agent with conversation state
    const result = await runAgent(selectedAgent, prompt, {
      silent: false,
      files: files,
      conversationId: existingConversationId,
    });

    // Save the conversation ID to Supabase if phone number provided
    if (phoneNumber && result.conversationId) {
      console.log('💾 Saving conversation to Supabase...');
      await saveConversation(phoneNumber, result.conversationId, selectedAgent);
    }

    // Return the response
    res.json({
      success: true,
      agent: selectedAgent,
      response: result.response,
      conversationId: result.conversationId, // Return conversation ID to frontend
      metadata: {
        duration_ms: result.duration_ms,
        cost_usd: result.cost_usd,
        usage: result.usage,
        files_processed: files ? files.length : 0,
      },
    });
  } catch (error) {
    console.error('❌ Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Voice agent session endpoint - creates ephemeral OpenAI Realtime API token
app.get('/api/voice-agent/session', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    console.log('📥 Received voice agent session token request');

    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not configured');
      return res.status(500).json({
        error: 'OPENAI_API_KEY not configured.',
      });
    }

    console.log('🔑 API key found, creating ephemeral session...');

    // Create ephemeral token for WebRTC - using shared config
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: REALTIME_CONFIG.model,
        voice: REALTIME_CONFIG.voice,
        input_audio_transcription: REALTIME_CONFIG.input_audio_transcription,
        turn_detection: REALTIME_CONFIG.turn_detection,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ OpenAI API error:', JSON.stringify(error, null, 2));
      console.error('Status:', response.status);
      console.error('Status text:', response.statusText);
      return res.status(response.status).json({
        error: error.error?.message || 'Failed to create session',
        details: error
      });
    }

    const data = await response.json();

    console.log('✅ Ephemeral session created successfully');
    console.log('Session ID:', data.id);
    console.log('Model:', data.model);
    console.log('Expires at:', data.client_secret?.expires_at);
    console.log('Token preview:', data.client_secret?.value?.substring(0, 20) + '...');

    // Validate token format
    if (!data.client_secret?.value?.startsWith('ek_')) {
      console.error('❌ WARNING: Token does not start with "ek_"');
      console.error('Token value:', data.client_secret?.value);
    }

    // Return the client secret for WebRTC connection
    return res.json({
      apiKey: data.client_secret.value,
      client_secret: data.client_secret.value,
      session: {
        id: data.id,
        model: data.model,
        expires_at: data.client_secret.expires_at
      }
    });

  } catch (error) {
    console.error('❌ Session creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// WhatsApp webhook endpoint
app.post('/api/whatsapp/webhook', handleWhatsAppWebhook);

// WhatsApp status callback endpoint (optional)
app.post('/api/whatsapp/status', handleStatusCallback);

// WhatsApp voice call endpoints
app.post('/api/whatsapp/voice/webhook', handleWhatsAppVoiceCall);
app.post('/api/whatsapp/voice/status', handleVoiceCallStatus);

// Setup WebSocket server for WhatsApp voice calls (Media Streams)
setupMediaStreamWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Guru Backend API server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🎤 Voice agent session: http://localhost:${PORT}/api/voice-agent/session`);
  console.log(`📱 WhatsApp webhook: http://localhost:${PORT}/api/whatsapp/webhook`);
  console.log(`📞 WhatsApp voice webhook: http://localhost:${PORT}/api/whatsapp/voice/webhook`);
  console.log(`🔌 WhatsApp voice stream: wss://localhost:${PORT}/api/whatsapp/voice/stream`);
});

