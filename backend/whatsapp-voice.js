import twilio from 'twilio';
import OpenAI from 'openai';
import { WebSocketServer } from 'ws';
import { routeToAgent } from './agent.js';
import { getSession } from './whatsapp.js';
import {
  REALTIME_CONFIG,
  getVoiceInstructions,
  formatConversationContext,
  createContextInjectionPayload,
  createInitialResponsePayload,
} from './voice-config.js';

/**
 * WhatsApp Voice Call Integration
 *
 * Handles incoming WhatsApp voice calls via Twilio
 * Integrates with OpenAI Realtime API for conversational AI
 * Supports agent routing based on user conversation history
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Store active voice call sessions
const voiceSessions = new Map();

/**
 * Get session data from WhatsApp message sessions
 * This allows voice calls to access conversation history
 */
function getWhatsAppSession(phoneNumber) {
  // Get session from shared WhatsApp sessions
  const session = getSession(phoneNumber);
  session.voiceCallActive = true;
  return session;
}

/**
 * Handle incoming WhatsApp voice call
 * Returns TwiML to connect the call to OpenAI Realtime API via Media Streams
 */
function handleWhatsAppVoiceCall(req, res) {
  console.log('\n' + '='.repeat(80));
  console.log('📞 [WHATSAPP VOICE] Incoming voice call received');
  console.log('='.repeat(80));

  try {
    const { From: from, To: to, CallSid: callSid } = req.body;

    console.log('📦 [WHATSAPP VOICE] Call details:');
    console.log(`   From: ${from}`);
    console.log(`   To: ${to}`);
    console.log(`   CallSid: ${callSid}`);

    // Extract phone number (remove 'whatsapp:' prefix)
    const phoneNumber = from.replace('whatsapp:', '');
    console.log(`📱 [WHATSAPP VOICE] Phone number: ${phoneNumber}`);

    // Create session for this call
    const session = getWhatsAppSession(phoneNumber);
    voiceSessions.set(callSid, {
      ...session,
      callSid,
      startTime: Date.now(),
    });

    console.log('💾 [WHATSAPP VOICE] Session created for call');

    // Generate TwiML response to connect call to Media Streams
    const twiml = new twilio.twiml.VoiceResponse();

    // Greet the user
    twiml.say(
      {
        voice: 'Polly.Matthew',
        language: 'en-US',
      },
      'Hello! I am your Guru assistant. How can I help you today?'
    );

    // Connect to Media Streams WebSocket for real-time audio processing
    const connect = twiml.connect();
    const stream = connect.stream({
      url: `wss://${req.get('host')}/api/whatsapp/voice/stream`,
    });

    // Pass call metadata to WebSocket
    stream.parameter({
      name: 'callSid',
      value: callSid,
    });
    stream.parameter({
      name: 'phoneNumber',
      value: phoneNumber,
    });

    console.log('✅ [WHATSAPP VOICE] TwiML generated, connecting to Media Stream');
    console.log('='.repeat(80) + '\n');

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('❌ [WHATSAPP VOICE] Error handling voice call:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, I encountered an error. Please try again later.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
}

/**
 * Handle voice call status callbacks
 */
function handleVoiceCallStatus(req, res) {
  const { CallSid, CallStatus, CallDuration } = req.body;

  console.log('\n' + '='.repeat(80));
  console.log('📊 [WHATSAPP VOICE STATUS] Call status update');
  console.log('='.repeat(80));
  console.log(`   CallSid: ${CallSid}`);
  console.log(`   Status: ${CallStatus}`);
  console.log(`   Duration: ${CallDuration || 'N/A'} seconds`);
  console.log('='.repeat(80) + '\n');

  // Clean up session when call ends
  if (CallStatus === 'completed') {
    const session = voiceSessions.get(CallSid);
    if (session) {
      console.log(`🧹 [WHATSAPP VOICE STATUS] Cleaning up session for ${CallSid}`);
      voiceSessions.delete(CallSid);
    }
  }

  res.sendStatus(200);
}

/**
 * Setup WebSocket server for Media Streams
 * This connects Twilio audio to OpenAI Realtime API
 */
function setupMediaStreamWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: '/api/whatsapp/voice/stream'
  });

  console.log('🎙️  [WHATSAPP VOICE] WebSocket server initialized for Media Streams');

  wss.on('connection', (ws) => {
    console.log('\n' + '='.repeat(80));
    console.log('🔌 [MEDIA STREAM] WebSocket connection established');
    console.log('='.repeat(80));

    let streamSid = null;
    let callSid = null;
    let phoneNumber = null;
    let openAiWs = null;
    let session = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.event) {
          case 'start':
            streamSid = data.start.streamSid;
            callSid = data.start.callSid;

            // Extract custom parameters
            const params = data.start.customParameters;
            phoneNumber = params.phoneNumber;

            console.log('🎬 [MEDIA STREAM] Stream started:');
            console.log(`   StreamSid: ${streamSid}`);
            console.log(`   CallSid: ${callSid}`);
            console.log(`   PhoneNumber: ${phoneNumber}`);

            // Get session data
            session = voiceSessions.get(callSid);

            // Connect to OpenAI Realtime API
            await connectToOpenAI(ws, callSid, phoneNumber, session);
            break;

          case 'media':
            // Forward audio to OpenAI
            if (openAiWs && openAiWs.readyState === 1) {
              const audioPayload = {
                type: 'input_audio_buffer.append',
                audio: data.media.payload,
              };
              openAiWs.send(JSON.stringify(audioPayload));
            }
            break;

          case 'stop':
            console.log('🛑 [MEDIA STREAM] Stream stopped');
            if (openAiWs) {
              openAiWs.close();
            }
            break;
        }
      } catch (error) {
        console.error('❌ [MEDIA STREAM] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('👋 [MEDIA STREAM] WebSocket connection closed');
      if (openAiWs) {
        openAiWs.close();
      }
      console.log('='.repeat(80) + '\n');
    });

    ws.on('error', (error) => {
      console.error('❌ [MEDIA STREAM] WebSocket error:', error);
    });

    /**
     * Connect to OpenAI Realtime API
     */
    async function connectToOpenAI(twilioWs, callSid, phoneNumber, session) {
      try {
        console.log('🤖 [OPENAI REALTIME] Connecting to OpenAI...');

        // Determine which agent to use based on conversation history
        let agentType = 'healthcare'; // default
        if (session?.conversationHistory && session.conversationHistory.length > 0) {
          console.log('🔀 [OPENAI REALTIME] Routing to appropriate agent...');
          // Get the last user message to determine agent
          const lastUserMessage = session.conversationHistory
            .filter(msg => msg.role === 'user')
            .pop();
          if (lastUserMessage) {
            agentType = await routeToAgent(lastUserMessage.content);
            console.log(`✅ [OPENAI REALTIME] Selected agent: ${agentType}`);
          }
        }

        // Get voice instructions for the selected agent
        const instructions = getVoiceInstructions(agentType, 'whatsapp');
        console.log(`📋 [OPENAI REALTIME] Using ${agentType} agent instructions`);

        // Create WebSocket connection to OpenAI Realtime API
        const { WebSocket } = await import('ws');
        openAiWs = new WebSocket(
          `wss://api.openai.com/v1/realtime?model=${REALTIME_CONFIG.model}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'OpenAI-Beta': 'realtime=v1',
            },
          }
        );

        openAiWs.on('open', async () => {
          console.log('✅ [OPENAI REALTIME] Connected to OpenAI Realtime API');

          // Configure session - using shared config
          const sessionUpdate = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: instructions,
              voice: REALTIME_CONFIG.voice,
              input_audio_format: 'g711_ulaw',
              output_audio_format: 'g711_ulaw',
              input_audio_transcription: REALTIME_CONFIG.input_audio_transcription,
              turn_detection: REALTIME_CONFIG.turn_detection,
            },
          };

          openAiWs.send(JSON.stringify(sessionUpdate));
          console.log('📤 [OPENAI REALTIME] Session configured');

          // Inject conversation history using Conversation Items API (matching webapp pattern)
          if (session?.conversationHistory && session.conversationHistory.length > 0) {
            console.log('🟢 [OPENAI REALTIME] Injecting conversation history via Conversation Items API...');
            console.log(`   - Injecting ${session.conversationHistory.length} messages as system context`);

            try {
              // Format conversation context using shared function
              const contextMessage = formatConversationContext(session.conversationHistory, 'whatsapp');

              console.log('\n==================== FULL CONTEXT MESSAGE ====================');
              console.log(contextMessage);
              console.log('==============================================================\n');

              // Create and send context injection payload
              const itemCreatePayload = createContextInjectionPayload(contextMessage);
              console.log('📤 [OPENAI REALTIME] Sending conversation.item.create');
              openAiWs.send(JSON.stringify(itemCreatePayload));

              // Wait a moment for the item to be added
              await new Promise(resolve => setTimeout(resolve, 100));

              console.log('✅ [OPENAI REALTIME] Conversation history injected as system message');

              // Trigger initial greeting that acknowledges conversation history
              console.log('🟢 [OPENAI REALTIME] Triggering initial greeting...');

              const responseCreatePayload = createInitialResponsePayload();
              console.log('📤 [OPENAI REALTIME] Sending response.create');
              openAiWs.send(JSON.stringify(responseCreatePayload));

              console.log('✅ [OPENAI REALTIME] Successfully triggered initial response with conversation history');
            } catch (historyError) {
              console.error('⚠️ [OPENAI REALTIME] Error injecting conversation history:', historyError);
              console.warn('Continuing without conversation history...');
            }
          } else {
            console.log('🟢 [OPENAI REALTIME] No conversation history to inject');
          }
        });

        openAiWs.on('message', (message) => {
          try {
            const data = JSON.parse(message);

            // Handle different OpenAI event types
            switch (data.type) {
              case 'response.audio.delta':
                // Forward audio back to Twilio
                const audioPayload = {
                  event: 'media',
                  streamSid: streamSid,
                  media: {
                    payload: data.delta,
                  },
                };
                twilioWs.send(JSON.stringify(audioPayload));
                break;

              case 'response.audio_transcript.delta':
                console.log('🗣️  [OPENAI REALTIME] Assistant:', data.delta);
                break;

              case 'input_audio_buffer.speech_started':
                console.log('🎤 [OPENAI REALTIME] User started speaking');
                break;

              case 'input_audio_buffer.speech_stopped':
                console.log('🤫 [OPENAI REALTIME] User stopped speaking');
                break;

              case 'conversation.item.input_audio_transcription.completed':
                console.log('📝 [OPENAI REALTIME] User said:', data.transcript);

                // Save to conversation history
                if (session) {
                  session.conversationHistory.push({
                    role: 'user',
                    content: data.transcript,
                    timestamp: Date.now(),
                  });
                }
                break;

              case 'response.done':
                console.log('✅ [OPENAI REALTIME] Response completed');

                // Save assistant response to history
                if (session && data.response?.output) {
                  const assistantMessage = data.response.output
                    .filter(item => item.type === 'message')
                    .map(item => item.content)
                    .flat()
                    .filter(content => content.type === 'text')
                    .map(content => content.text)
                    .join(' ');

                  if (assistantMessage) {
                    session.conversationHistory.push({
                      role: 'assistant',
                      content: assistantMessage,
                      timestamp: Date.now(),
                    });
                  }
                }
                break;

              case 'error':
                console.error('❌ [OPENAI REALTIME] Error:', data.error);
                break;
            }
          } catch (error) {
            console.error('❌ [OPENAI REALTIME] Error processing message:', error);
          }
        });

        openAiWs.on('close', () => {
          console.log('👋 [OPENAI REALTIME] Connection closed');
        });

        openAiWs.on('error', (error) => {
          console.error('❌ [OPENAI REALTIME] WebSocket error:', error);
        });

      } catch (error) {
        console.error('❌ [OPENAI REALTIME] Error connecting:', error);
      }
    }
  });

  return wss;
}

/**
 * Initiate outbound WhatsApp voice call
 * Note: Requires user consent via message template first
 */
async function initiateWhatsAppCall(phoneNumber, options = {}) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    console.log(`📞 [WHATSAPP VOICE] Initiating outbound call to ${phoneNumber}`);

    const call = await client.calls.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phoneNumber}`,
      url: options.twimlUrl || `${process.env.BASE_URL}/api/whatsapp/voice/webhook`,
      statusCallback: options.statusCallback || `${process.env.BASE_URL}/api/whatsapp/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    console.log(`✅ [WHATSAPP VOICE] Call initiated: ${call.sid}`);
    return call;
  } catch (error) {
    console.error('❌ [WHATSAPP VOICE] Error initiating call:', error);
    throw error;
  }
}

/**
 * Send WhatsApp message template with voice call button
 * This is required before initiating outbound calls (user consent)
 */
async function sendVoiceCallTemplate(phoneNumber, templateData) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    console.log(`📤 [WHATSAPP VOICE] Sending voice call template to ${phoneNumber}`);

    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phoneNumber}`,
      contentSid: templateData.contentSid, // Pre-approved template SID
      contentVariables: JSON.stringify(templateData.variables || {}),
    });

    console.log(`✅ [WHATSAPP VOICE] Template sent: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('❌ [WHATSAPP VOICE] Error sending template:', error);
    throw error;
  }
}

export {
  handleWhatsAppVoiceCall,
  handleVoiceCallStatus,
  setupMediaStreamWebSocket,
  initiateWhatsAppCall,
  sendVoiceCallTemplate,
  voiceSessions,
};
