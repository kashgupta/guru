# WhatsApp Integration Quick Start

Get your WhatsApp agent running in 5 minutes!

## Quick Setup Steps

### 1. Install Dependencies (Already Done ✅)
```bash
cd backend
npm install
```

### 2. Configure Twilio Sandbox

1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Send the join code from your WhatsApp (example: send "join happy-dog" to +1 415 523 8886)
3. Get your credentials from: https://console.twilio.com

### 3. Update .env File

```env
OPENAI_API_KEY=your_key_here
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### 4. Expose Your Local Server

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# Start your backend (in one terminal)
cd backend
npm start

# Start ngrok (in another terminal)
ngrok http 3001
```

Copy the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 5. Configure Twilio Webhook

1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. In "WHEN A MESSAGE COMES IN", paste:
   ```
   https://your-ngrok-url.ngrok.io/api/whatsapp/webhook
   ```
3. Click Save

### 6. Test It!

Send a WhatsApp message to the Twilio number:
- Text: "I need help with health insurance"
- Voice: Record a voice message asking a question

You should get a response from your agent!

## What's Implemented

- Text messages → Agent responses
- Voice messages → Transcribed and processed
- Smart routing → Healthcare, Financial, or Legal agent
- Session management → Tracks conversation history

## Next: See Full Setup Guide

For production deployment and advanced features, see [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)
