# Guru Backend

Backend agent service using OpenAI Agents SDK for providing healthcare, financial, and legal guidance to immigrants.

## Features

- Custom AI agents for healthcare, financial, and legal advice
- RESTful API endpoints for web integration
- **WhatsApp integration** via Twilio (text and voice messages)
- Voice message transcription using OpenAI Whisper
- Intelligent agent routing based on user queries
- Session management for conversation history

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Create a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your_openai_key_here

   # For WhatsApp integration
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_WHATSAPP_NUMBER=+14155238886
   ```

## Usage

### Run the HTTP API Server

```bash
npm start
```

The server will start on http://localhost:3001 with these endpoints:

- `GET /health` - Health check
- `POST /api/chat` - Chat with the agent (web interface)
- `POST /api/whatsapp/webhook` - WhatsApp webhook (for Twilio)
- `POST /api/whatsapp/status` - WhatsApp status callback

### WhatsApp Integration

See [WHATSAPP_QUICKSTART.md](./WHATSAPP_QUICKSTART.md) for a 5-minute setup guide.

For detailed setup instructions, see [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md).

## Files

- `agent.js` - Main agent implementation with custom agents for healthcare, financial, and legal domains
- `server.js` - Express server with REST API endpoints
- `whatsapp.js` - WhatsApp integration handler with Twilio
- `WHATSAPP_SETUP.md` - Detailed WhatsApp setup guide
- `WHATSAPP_QUICKSTART.md` - Quick start guide for WhatsApp

## How It Works

1. **Agent Routing**: Incoming messages are analyzed to determine which agent (healthcare, financial, or legal) should handle the request
2. **Message Processing**: Text or voice messages are processed by the appropriate agent
3. **Voice Support**: Voice messages are transcribed using OpenAI Whisper before processing
4. **Response Delivery**: Agent responses are sent back via the same channel (web or WhatsApp)

## Documentation

- [OpenAI Agents SDK documentation](https://openai.github.io/openai-agents-js/)
- [Twilio WhatsApp API documentation](https://www.twilio.com/docs/whatsapp)
- [OpenAI API documentation](https://platform.openai.com/docs)

