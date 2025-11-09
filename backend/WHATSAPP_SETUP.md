# WhatsApp Integration Setup Guide

This guide will help you integrate your Guru voice agent with WhatsApp using Twilio.

## Prerequisites

- A Twilio account (sign up at https://www.twilio.com/try-twilio)
- OpenAI API key (for voice transcription and TTS)
- A publicly accessible URL for webhooks (use ngrok for local development)

## Step 1: Set Up Twilio Account

1. **Sign up for Twilio**
   - Go to https://www.twilio.com/try-twilio
   - Create a free account (you'll get $15 in trial credit)

2. **Find Your Account Credentials**
   - Go to your Twilio Console Dashboard
   - Copy your `Account SID` and `Auth Token`
   - You'll need these for your `.env` file

## Step 2: Enable WhatsApp Sandbox (For Testing)

Twilio provides a WhatsApp Sandbox for testing without approval from Meta.

1. **Access WhatsApp Sandbox**
   - In Twilio Console, go to **Messaging** > **Try it out** > **Send a WhatsApp message**
   - Or directly visit: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn

2. **Join the Sandbox**
   - You'll see a message like: "join <code-word>"
   - Send this message from your WhatsApp to the number shown (usually +1 415 523 8886)
   - Example: Send "join <your-code>" to +1 415 523 8886
   - You should receive a confirmation message

3. **Note the Sandbox Number**
   - The sandbox WhatsApp number (e.g., +14155238886)
   - You'll use this as `TWILIO_WHATSAPP_NUMBER` in your `.env`

## Step 3: Configure Environment Variables

Update your `.env` file in the project root:

```env
# OpenAI (already configured)
OPENAI_API_KEY=your_openai_key_here

# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886
```

## Step 4: Expose Your Local Server (Development)

For local testing, you need to expose your server to the internet so Twilio can send webhooks.

### Option A: Using ngrok (Recommended)

1. **Install ngrok**
   ```bash
   # macOS
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

2. **Start your backend server**
   ```bash
   cd backend
   npm start
   ```
   Your server should be running on http://localhost:3001

3. **Start ngrok**
   ```bash
   ngrok http 3001
   ```

4. **Copy the HTTPS URL**
   - ngrok will display a URL like: `https://abc123.ngrok.io`
   - Copy this URL (you'll need it for the next step)

### Option B: Using Twilio CLI (Alternative)

```bash
# Install Twilio CLI
npm install -g twilio-cli

# Login to Twilio
twilio login

# Start tunnel
twilio phone-numbers:update [YOUR_PHONE_NUMBER] \
  --sms-url="http://localhost:3001/api/whatsapp/webhook"
```

## Step 5: Configure Twilio Webhook

1. **Go to WhatsApp Sandbox Settings**
   - Navigate to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
   - Or: **Messaging** > **Try it out** > **Send a WhatsApp message** > **Sandbox settings**

2. **Set the Webhook URL**
   - In the "WHEN A MESSAGE COMES IN" field, enter:
     ```
     https://your-ngrok-url.ngrok.io/api/whatsapp/webhook
     ```
   - Make sure HTTP method is set to `POST`

3. **Optional: Set Status Callback URL**
   - In the "STATUS CALLBACK URL" field, enter:
     ```
     https://your-ngrok-url.ngrok.io/api/whatsapp/status
     ```

4. **Click Save**

## Step 6: Test Your Integration

1. **Send a Text Message**
   - Open WhatsApp on your phone
   - Send a message to the Twilio Sandbox number
   - Example: "I need help with health insurance"
   - You should receive a response from your agent

2. **Send a Voice Message**
   - Record a voice message in WhatsApp
   - Send it to the Twilio Sandbox number
   - The agent will transcribe it and respond

3. **Check Logs**
   - Watch your server console for logs
   - You should see:
     ```
     📱 Received WhatsApp message from: +1234567890
     🔀 Routing to appropriate agent...
     ✅ Selected agent: healthcare
     💬 healthcare Advisor: [response]
     ✅ Response sent to +1234567890
     ```

## Step 7: Production Setup (After Testing)

Once you're ready for production, you need to:

1. **Request WhatsApp Business API Access**
   - Go to https://www.twilio.com/whatsapp
   - Click "Request Access"
   - Fill out the form with your business details
   - Wait for approval (can take a few days)

2. **Get Your Own WhatsApp Business Number**
   - After approval, you can get a dedicated WhatsApp number
   - Configure it in your Twilio console

3. **Deploy Your Backend**
   - Deploy to a hosting service (Heroku, AWS, DigitalOcean, etc.)
   - Update webhook URLs to your production URL
   - Set environment variables in your hosting platform

4. **Update Webhook Configuration**
   - Use your production URL instead of ngrok
   - Example: `https://api.yourapp.com/api/whatsapp/webhook`

## Troubleshooting

### Issue: "Webhook failed"
- Check that your server is running
- Verify ngrok is running and the URL is correct
- Check server logs for errors
- Make sure webhook URL in Twilio console is correct

### Issue: "Authentication failed"
- Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct
- Check that there are no extra spaces in `.env` file

### Issue: "Voice messages not working"
- Verify `OPENAI_API_KEY` is set correctly
- Check that OpenAI API has credits available
- Look at server logs for specific errors

### Issue: "Messages not reaching agent"
- Check that you've joined the Twilio Sandbox
- Verify webhook URL is publicly accessible
- Test webhook manually with curl:
  ```bash
  curl -X POST https://your-ngrok-url.ngrok.io/api/whatsapp/webhook \
    -d "From=whatsapp:+1234567890" \
    -d "Body=test message"
  ```

## Features Implemented

- ✅ Text message handling
- ✅ Voice message transcription (using OpenAI Whisper)
- ✅ Agent routing (healthcare, financial, legal)
- ✅ Session management
- ✅ Conversation history
- ✅ Webhook security validation
- ✅ Error handling and recovery

## Next Steps / Enhancements

Consider adding these features:

1. **Voice Responses**
   - Send voice messages back to users
   - Use the `textToSpeech` function already implemented

2. **Persistent Storage**
   - Store conversations in a database
   - Currently using in-memory storage

3. **Multi-language Support**
   - Detect user language
   - Configure Whisper language parameter

4. **Rich Media**
   - Send images, PDFs with helpful information
   - Use Twilio's media capabilities

5. **Proactive Messages**
   - Send appointment reminders
   - Follow-up messages

6. **Analytics**
   - Track usage patterns
   - Monitor agent performance

## API Reference

### Webhook Endpoint
- **URL**: `POST /api/whatsapp/webhook`
- **Receives**: Form data from Twilio
- **Returns**: TwiML response

### Status Callback Endpoint
- **URL**: `POST /api/whatsapp/status`
- **Receives**: Message status updates
- **Returns**: 200 OK

## Security Best Practices

1. **Always validate Twilio signatures** in production
2. **Keep your Auth Token secret** - never commit to git
3. **Use HTTPS** for all webhook URLs
4. **Implement rate limiting** to prevent abuse
5. **Monitor usage** to detect unusual patterns

## Cost Considerations

### Twilio Costs
- WhatsApp messages: ~$0.005 per message (varies by country)
- Voice messages: Same rate
- Check current pricing: https://www.twilio.com/whatsapp/pricing

### OpenAI Costs
- Whisper transcription: $0.006 per minute
- GPT-4 (via Claude Agent): Check OpenAI pricing
- TTS: $15 per million characters

## Support

- Twilio Documentation: https://www.twilio.com/docs/whatsapp
- Twilio Support: https://support.twilio.com
- OpenAI Documentation: https://platform.openai.com/docs

## License

This integration is part of the Guru project.
