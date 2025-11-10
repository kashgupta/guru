import twilio from 'twilio';
import axios from 'axios';
import { runAgent, routeToAgent } from './agent.js';
import OpenAI from 'openai';

/**
 * WhatsApp Integration Handler
 *
 * Handles incoming WhatsApp messages via Twilio
 * Supports both text and voice messages
 * Integrates with the existing agent system
 */

// Initialize OpenAI for voice processing
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store session data (in production, use a database)
const sessions = new Map();

/**
 * Get or create a session for a WhatsApp user
 */
function getSession(phoneNumber) {
  if (!sessions.has(phoneNumber)) {
    sessions.set(phoneNumber, {
      phoneNumber,
      conversationHistory: [],
      lastActivity: Date.now(),
    });
  }

  const session = sessions.get(phoneNumber);
  session.lastActivity = Date.now();
  return session;
}

/**
 * Download audio file from Twilio
 */
async function downloadAudio(mediaUrl, authToken) {
  try {
    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID,
        password: authToken,
      },
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading audio:', error.message);
    throw error;
  }
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeAudio(audioBuffer, mimeType) {
  try {
    // Convert buffer to file-like object
    const file = new File([audioBuffer], 'audio.ogg', { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en', // Can be made dynamic based on user preference
    });

    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error.message);
    throw error;
  }
}

/**
 * Convert text to speech using OpenAI TTS
 */
async function textToSpeech(text) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // Can be configured: alloy, echo, fable, onyx, nova, shimmer
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error('Error converting text to speech:', error.message);
    throw error;
  }
}

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsAppMessage(to, message, mediaUrl = null) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const messageData = {
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message,
    };

    if (mediaUrl) {
      messageData.mediaUrl = [mediaUrl];
    }

    const sentMessage = await client.messages.create(messageData);
    return sentMessage;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
    throw error;
  }
}

/**
 * Main webhook handler for incoming WhatsApp messages
 */
async function handleWhatsAppWebhook(req, res) {
  console.log('\n' + '='.repeat(80));
  console.log('📱 [WHATSAPP WEBHOOK] Incoming request received');
  console.log('='.repeat(80));

  try {
    // Validate Twilio signature for security
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    console.log('🔒 [WHATSAPP WEBHOOK] Validating Twilio signature...');
    console.log(`   URL: ${url}`);
    console.log(`   Signature present: ${!!twilioSignature}`);

    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      req.body
    );

    console.log(`   Signature valid: ${isValid}`);

    if (!isValid && process.env.NODE_ENV === 'production') {
      console.error('❌ [WHATSAPP WEBHOOK] Invalid Twilio signature');
      return res.status(403).send('Forbidden');
    }

    const {
      From: from,
      Body: body,
      NumMedia: numMedia,
      MediaUrl0: mediaUrl,
      MediaContentType0: mediaContentType,
    } = req.body;

    console.log('📦 [WHATSAPP WEBHOOK] Request body parsed:');
    console.log(`   From: ${from}`);
    console.log(`   Body: ${body || '(empty)'}`);
    console.log(`   NumMedia: ${numMedia || 0}`);
    console.log(`   MediaContentType: ${mediaContentType || 'none'}`);

    // Extract phone number (remove 'whatsapp:' prefix)
    const phoneNumber = from.replace('whatsapp:', '');
    console.log(`📱 [WHATSAPP WEBHOOK] Phone number extracted: ${phoneNumber}`);

    // Get or create session
    console.log('💾 [WHATSAPP WEBHOOK] Getting/creating session for user...');
    const session = getSession(phoneNumber);
    console.log(`   Session exists: ${!!session}`);
    console.log(`   Conversation history length: ${session.conversationHistory.length}`);

    let userMessage = body || '';

    // Handle voice messages
    if (parseInt(numMedia) > 0 && mediaContentType?.includes('audio')) {
      console.log('🎤 [WHATSAPP WEBHOOK] Voice message detected, processing...');

      try {
        console.log('📥 [WHATSAPP WEBHOOK] Downloading audio from Twilio...');
        // Download audio from Twilio
        const audioBuffer = await downloadAudio(
          mediaUrl,
          process.env.TWILIO_AUTH_TOKEN
        );
        console.log(`   Audio downloaded: ${audioBuffer.length} bytes`);

        console.log('🗣️  [WHATSAPP WEBHOOK] Transcribing audio using Whisper...');
        // Transcribe using Whisper
        userMessage = await transcribeAudio(audioBuffer, mediaContentType);
        console.log(`✅ [WHATSAPP WEBHOOK] Transcribed: "${userMessage}"`);

        // Send acknowledgment
        console.log('📤 [WHATSAPP WEBHOOK] Sending acknowledgment to user...');
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message(`I heard: "${userMessage}". Processing your request...`);
        res.type('text/xml').send(twiml.toString());
      } catch (error) {
        console.error('❌ [WHATSAPP WEBHOOK] Error processing voice message:', error);
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('Sorry, I had trouble processing your voice message. Please try again or send a text message.');
        return res.type('text/xml').send(twiml.toString());
      }
    } else if (!userMessage) {
      // No text and no audio
      console.log('⚠️  [WHATSAPP WEBHOOK] No message content, sending greeting...');
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Hello! I can help you with healthcare, financial, or legal questions. Send me a text or voice message!');
      return res.type('text/xml').send(twiml.toString());
    } else {
      // Regular text message - send immediate response
      console.log('💬 [WHATSAPP WEBHOOK] Text message received, sending acknowledgment...');
      const twiml = new twilio.twiml.MessagingResponse();
      res.type('text/xml').send(twiml.toString());
    }

    // Process message with agent (asynchronously)
    console.log('🚀 [WHATSAPP WEBHOOK] Starting async agent processing...');
    console.log(`   User message: "${userMessage}"`);
    processMessageAsync(phoneNumber, userMessage, session);

  } catch (error) {
    console.error('❌ Error handling WhatsApp webhook:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, I encountered an error. Please try again later.');
    res.type('text/xml').send(twiml.toString());
  }
}

/**
 * Process message asynchronously to avoid webhook timeout
 */
async function processMessageAsync(phoneNumber, userMessage, session) {
  console.log('\n' + '='.repeat(80));
  console.log('⚙️  [ASYNC PROCESSOR] Starting message processing');
  console.log('='.repeat(80));
  console.log(`   Phone: ${phoneNumber}`);
  console.log(`   Message: "${userMessage}"`);

  try {
    // Add to conversation history
    console.log('💾 [ASYNC PROCESSOR] Adding user message to conversation history...');
    session.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });
    console.log(`   History length: ${session.conversationHistory.length}`);

    // Route to appropriate agent
    console.log('\n🔀 [ASYNC PROCESSOR] Routing to appropriate agent...');
    console.log(`   Message for routing: "${userMessage}"`);
    const selectedAgent = await routeToAgent(userMessage);
    console.log(`✅ [ASYNC PROCESSOR] Agent selected: ${selectedAgent}`);

    // Run the agent
    console.log(`\n🤖 [ASYNC PROCESSOR] Running ${selectedAgent} agent...`);
    const result = await runAgent(selectedAgent, userMessage, { silent: false });
    console.log(`✅ [ASYNC PROCESSOR] Agent completed`);
    console.log(`   Response length: ${result.response?.length || 0} characters`);
    console.log(`   Success: ${result.success}`);
    console.log(`   Duration: ${result.duration_ms}ms`);

    // Add to conversation history
    console.log('💾 [ASYNC PROCESSOR] Adding assistant response to history...');
    session.conversationHistory.push({
      role: 'assistant',
      content: result.response,
      agent: selectedAgent,
      timestamp: Date.now(),
    });
    console.log(`   History length: ${session.conversationHistory.length}`);

    // Send response back to user
    console.log(`\n📤 [ASYNC PROCESSOR] Sending response to WhatsApp user ${phoneNumber}...`);
    console.log(`   Response preview: "${result.response.substring(0, 100)}..."`);
    await sendWhatsAppMessage(phoneNumber, result.response);

    console.log(`✅ [ASYNC PROCESSOR] Response sent successfully to ${phoneNumber}`);
    console.log('='.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ [ASYNC PROCESSOR] Error processing message:');
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error stack: ${error.stack}`);

    console.log('📤 [ASYNC PROCESSOR] Sending error message to user...');
    await sendWhatsAppMessage(
      phoneNumber,
      'Sorry, I encountered an error processing your request. Please try again.'
    );
    console.log('='.repeat(80) + '\n');
  }
}

/**
 * Status callback handler (optional)
 */
function handleStatusCallback(req, res) {
  const { MessageStatus, MessageSid } = req.body;
  console.log(`Message ${MessageSid} status: ${MessageStatus}`);
  res.sendStatus(200);
}

/**
 * Clean up old sessions (run periodically)
 */
function cleanupOldSessions() {
  const now = Date.now();
  const timeout = 60 * 60 * 1000; // 1 hour

  for (const [phoneNumber, session] of sessions.entries()) {
    if (now - session.lastActivity > timeout) {
      sessions.delete(phoneNumber);
      console.log(`🧹 Cleaned up session for ${phoneNumber}`);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldSessions, 10 * 60 * 1000);

export {
  handleWhatsAppWebhook,
  handleStatusCallback,
  sendWhatsAppMessage,
  transcribeAudio,
  textToSpeech,
};
