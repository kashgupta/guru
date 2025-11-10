# WhatsApp Voice Call Integration Setup

This guide explains how to set up and use WhatsApp voice calling in the Guru backend.

## Overview

The WhatsApp voice integration allows users to make voice calls directly through WhatsApp, powered by:
- **Twilio WhatsApp Business Calling** - VoIP calling through WhatsApp
- **OpenAI Realtime API** - Conversational AI for natural voice interactions
- **Twilio Media Streams** - Real-time audio streaming via WebSocket
- **Shared Voice Configuration** - Uses the exact same voice agent as the webapp

### Key Features
- **Unified Voice Experience**: WhatsApp calls use the same OpenAI Realtime API configuration as the webapp voice agent
- **Agent Routing**: Automatically routes to the correct agent (healthcare, financial, legal) based on conversation history
- **Conversation Continuity**: Full access to WhatsApp message history during voice calls
- **Context Injection**: Uses the same context injection pattern as the webapp

## Prerequisites

1. **Twilio Account** with WhatsApp Business Calling enabled
2. **WhatsApp-enabled phone number** (WhatsApp sender)
3. **Meta Business Verification** (required for WhatsApp Business Calling)
4. **OpenAI API Key** with access to Realtime API
5. **Public HTTPS URL** for webhooks (use ngrok for local testing)

## Setup Steps

### 1. Enable WhatsApp Business Calling in Twilio

1. Log into [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging → Services → WhatsApp senders**
3. Select your WhatsApp-enabled phone number
4. Ensure it has **Voice** capabilities enabled
5. Note: WhatsApp Business Calling became GA in July 2025

### 2. Configure Environment Variables

Ensure your `.env` file has:

```env
# OpenAI API Key (for Realtime API)
OPENAI_API_KEY=sk-...

# Twilio Configuration
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+14155238886

# Base URL for webhooks (use ngrok URL for local dev)
BASE_URL=https://your-domain.com
```

### 3. Create TwiML Application

1. Go to **Voice → Manage → TwiML Apps** in Twilio Console
2. Click **Create new TwiML App**
3. Set **Voice Configuration Request URL** to:
   ```
   https://your-domain.com/api/whatsapp/voice/webhook
   ```
4. Set **Voice Configuration Status Callback URL** to:
   ```
   https://your-domain.com/api/whatsapp/voice/status
   ```
5. Save and note the **TwiML App SID**

### 4. Link TwiML App to WhatsApp Sender

Using Twilio CLI:
```bash
twilio api:messaging:v1:services:phone-numbers:update \
  --service-sid MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --sid PNXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --voice-application-sid APXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Or via API:
```bash
curl -X POST https://messaging.twilio.com/v1/Services/{ServiceSid}/PhoneNumbers/{PhoneNumberSid} \
  --data-urlencode "VoiceApplicationSid=APXXXXXXXXXXXXXXXXXXXXXXXX" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

### 5. Expose Local Server (Development Only)

For local testing, use ngrok:
```bash
ngrok http 3001
```

Update your `.env`:
```env
BASE_URL=https://your-ngrok-url.ngrok.io
```

### 6. Start the Backend

```bash
cd backend
npm install ws  # Install WebSocket dependency if not already installed
npm start
```

You should see:
```
🚀 Guru Backend API server running on http://localhost:3001
📞 WhatsApp voice webhook: http://localhost:3001/api/whatsapp/voice/webhook
🔌 WhatsApp voice stream: wss://localhost:3001/api/whatsapp/voice/stream
```

## How It Works

### Incoming Voice Calls (User → Bot)

1. **User initiates call** via WhatsApp "Call" button
2. **Twilio webhook** sends call data to `/api/whatsapp/voice/webhook`
3. **TwiML response** connects call to Media Stream WebSocket
4. **WebSocket bridge** connects Twilio audio to OpenAI Realtime API
5. **AI conversation** happens in real-time with voice
6. **Conversation history** is shared with WhatsApp messaging sessions

### Outbound Voice Calls (Bot → User)

⚠️ **Important**: Outbound calls require user consent first!

1. **Send message template** with voice call button (required for consent)
2. **User taps button** to authorize
3. **Backend initiates call** using `initiateWhatsAppCall()`

Example:
```javascript
import { sendVoiceCallTemplate, initiateWhatsAppCall } from './whatsapp-voice.js';

// Step 1: Send template with call button
await sendVoiceCallTemplate('+1234567890', {
  contentSid: 'HXxxxxx',  // Your approved template SID
  variables: { name: 'John' }
});

// Step 2: After user consent, initiate call
await initiateWhatsAppCall('+1234567890');
```

## Architecture

```
WhatsApp User
     ↕️
Twilio WhatsApp VoIP
     ↕️
TwiML Voice Webhook (/api/whatsapp/voice/webhook)
     ↕️
Twilio Media Streams (WebSocket)
     ↕️
Backend WebSocket Server (/api/whatsapp/voice/stream)
     ↕️
voice-config.js (Shared Configuration)
     ↕️
OpenAI Realtime API (gpt-4o-realtime)
```

### Code Organization

The voice functionality is organized as follows:

- **`voice-config.js`** - Shared configuration for both webapp and WhatsApp voice
  - Agent prompts (healthcare, financial, legal)
  - OpenAI Realtime API settings
  - Context formatting utilities
  - Used by both webapp (`/api/voice-agent/session`) and WhatsApp voice calls

- **`whatsapp-voice.js`** - WhatsApp-specific voice call handling
  - TwiML webhook handlers
  - Media Streams WebSocket bridge
  - Imports and uses shared config from `voice-config.js`

- **`server.js`** - Main server with endpoints
  - `/api/voice-agent/session` - Webapp voice agent (uses shared config)
  - `/api/whatsapp/voice/webhook` - WhatsApp voice calls (uses shared config)

## Features

### Conversation Continuity
- Voice calls share session data with WhatsApp messages
- Full conversation history is available during calls
- Transcripts are saved to session after calls end

### Real-time AI
- Natural conversation with OpenAI's Realtime API
- Voice Activity Detection (VAD) for turn-taking
- Automatic transcription via Whisper
- Low-latency audio streaming (g711_ulaw codec)

### Session Management
- Sessions are shared between messages and voice calls
- Automatic cleanup after 1 hour of inactivity
- Phone number-based session tracking

## API Endpoints

### `POST /api/whatsapp/voice/webhook`
Handles incoming WhatsApp voice calls. Returns TwiML to connect to Media Stream.

**Request** (from Twilio):
```
From: whatsapp:+1234567890
To: whatsapp:+14155238886
CallSid: CA...
```

**Response**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello! I am your Guru assistant...</Say>
  <Connect>
    <Stream url="wss://your-domain.com/api/whatsapp/voice/stream">
      <Parameter name="callSid" value="CA..."/>
      <Parameter name="phoneNumber" value="+1234567890"/>
    </Stream>
  </Connect>
</Response>
```

### `POST /api/whatsapp/voice/status`
Receives call status updates (initiated, ringing, answered, completed).

### `WebSocket /api/whatsapp/voice/stream`
Media Stream WebSocket that bridges Twilio audio to OpenAI Realtime API.

## Limitations

1. **No PSTN connections**: WhatsApp calls cannot connect to regular phone numbers
2. **Geographic restrictions**: Not available in sanctioned countries
3. **Outbound call restrictions**: Business-initiated calls restricted in USA, Canada, Egypt, Nigeria, Turkey, Vietnam
4. **Consent required**: Must use message templates with call buttons before outbound calls
5. **Meta verification**: Requires Meta Business Verification for production use

## Testing

### Test Incoming Call
1. Open WhatsApp on your phone
2. Message your WhatsApp Business number
3. Tap the "Call" button in the chat
4. Speak with the AI assistant

### Test with Sandbox
If using Twilio's WhatsApp sandbox:
1. Send "join \<your-sandbox-code\>" to +1 415 523 8886
2. The call button should appear
3. Tap to initiate voice call

## Troubleshooting

### "Failed to connect call"
- Verify TwiML app is linked to WhatsApp sender
- Check webhook URL is publicly accessible
- Ensure WhatsApp Business Calling is enabled

### WebSocket connection fails
- Verify `ws` npm package is installed
- Check server is using HTTP server (not just Express app)
- Ensure BASE_URL uses `wss://` for WebSocket URL

### OpenAI connection issues
- Verify OPENAI_API_KEY has Realtime API access
- Check OpenAI API status
- Review audio format compatibility (g711_ulaw)

### No audio from AI
- Check Media Stream is connecting (look for logs)
- Verify audio codec format matches (g711_ulaw)
- Ensure bidirectional audio flow

## Cost Considerations

- **Twilio WhatsApp Voice**: ~$0.0085/minute
- **OpenAI Realtime API**: ~$0.06/minute (input) + ~$0.24/minute (output)
- **Total estimated cost**: ~$0.30/minute of conversation

## Next Steps

- [ ] Create message templates with VOICE_CALL buttons
- [ ] Implement outbound calling workflow
- [ ] Add call recording/transcription storage
- [ ] Integrate with specific agent routing
- [ ] Set up production database for sessions
- [ ] Add call analytics and monitoring

## Resources

- [Twilio WhatsApp Business Calling Docs](https://www.twilio.com/docs/voice/whatsapp-business-calling)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/twiml/stream)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [TwiML Voice Reference](https://www.twilio.com/docs/voice/twiml)
