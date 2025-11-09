# WhatsApp Integration Setup Checklist

Use this checklist to set up your WhatsApp integration step by step.

## Prerequisites

- [ ] Twilio account created
- [ ] OpenAI API key obtained
- [ ] ngrok installed (or alternative tunneling tool)

## Configuration Steps

### 1. Twilio Setup

- [ ] Sign up at https://www.twilio.com/try-twilio
- [ ] Copy Account SID from Twilio Console
- [ ] Copy Auth Token from Twilio Console
- [ ] Access WhatsApp Sandbox: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- [ ] Send join code from your phone (e.g., "join happy-dog" to +1 415 523 8886)
- [ ] Receive confirmation message in WhatsApp

### 2. Environment Configuration

- [ ] Copy [.env.example](.env.example) to project root as `.env`
- [ ] Add your `OPENAI_API_KEY` to `.env`
- [ ] Add your `TWILIO_ACCOUNT_SID` to `.env`
- [ ] Add your `TWILIO_AUTH_TOKEN` to `.env`
- [ ] Verify `TWILIO_WHATSAPP_NUMBER` is correct (default: +14155238886)
- [ ] Run `npm run test:whatsapp` to verify configuration

### 3. Server Setup

- [ ] Install dependencies: `npm install`
- [ ] Start backend server: `npm start`
- [ ] Verify server is running on http://localhost:3001
- [ ] Test health endpoint: `curl http://localhost:3001/health`

### 4. Tunnel Setup (Development)

- [ ] Install ngrok: `brew install ngrok` (macOS) or download from https://ngrok.com
- [ ] Start ngrok: `ngrok http 3001`
- [ ] Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
- [ ] Keep ngrok running in a separate terminal

### 5. Twilio Webhook Configuration

- [ ] Go to WhatsApp Sandbox Settings: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
- [ ] In "WHEN A MESSAGE COMES IN", paste: `https://your-ngrok-url.ngrok.io/api/whatsapp/webhook`
- [ ] Ensure HTTP method is set to `POST`
- [ ] (Optional) Set status callback: `https://your-ngrok-url.ngrok.io/api/whatsapp/status`
- [ ] Click "Save"

### 6. Testing

- [ ] Send text message to Twilio number: "Hello, I need help with health insurance"
- [ ] Verify you receive a response
- [ ] Send voice message to Twilio number
- [ ] Verify voice message is transcribed and responded to
- [ ] Check server logs for any errors
- [ ] Verify correct agent is selected (healthcare/financial/legal)

### 7. Verification

- [ ] Text messages working
- [ ] Voice messages working
- [ ] Agent routing working correctly
- [ ] Responses are relevant and helpful
- [ ] No errors in server console
- [ ] Twilio webhook logs show success (check in Twilio Console)

## Troubleshooting

If something isn't working:

1. **Run the test script**
   ```bash
   npm run test:whatsapp
   ```

2. **Check common issues**
   - [ ] Server is running
   - [ ] ngrok is running
   - [ ] Webhook URL in Twilio matches ngrok URL
   - [ ] Environment variables are correct (no placeholders)
   - [ ] You've joined the WhatsApp Sandbox
   - [ ] No syntax errors: `node --check whatsapp.js`

3. **Check logs**
   - [ ] Server console for errors
   - [ ] Twilio Console > Monitor > Logs > Errors
   - [ ] ngrok web interface: http://localhost:4040

4. **Test webhook manually**
   ```bash
   curl -X POST http://localhost:3001/api/whatsapp/webhook \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "From=whatsapp:+1234567890" \
     -d "Body=test message"
   ```

## Production Deployment

After successful testing:

- [ ] Request WhatsApp Business API access from Twilio
- [ ] Get approved WhatsApp Business number
- [ ] Deploy backend to production server (Heroku, AWS, etc.)
- [ ] Update webhook URL to production URL
- [ ] Update environment variables in production
- [ ] Set `NODE_ENV=production` in production environment
- [ ] Test thoroughly in production
- [ ] Monitor usage and costs

## Documentation

- [WHATSAPP_QUICKSTART.md](./WHATSAPP_QUICKSTART.md) - Quick 5-minute setup
- [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) - Detailed setup guide
- [README.md](./README.md) - Backend documentation
- [../WHATSAPP_INTEGRATION_SUMMARY.md](../WHATSAPP_INTEGRATION_SUMMARY.md) - What's been built

## Success Criteria

Your integration is working when:

✅ You can send a text message and receive a relevant response
✅ You can send a voice message and it's transcribed correctly
✅ The correct agent (healthcare/financial/legal) responds
✅ No errors in server logs
✅ Twilio webhook logs show 200 status

## Next Steps

Once everything is working:

1. Explore sending proactive messages (see [whatsapp-example.js](./whatsapp-example.js))
2. Consider adding voice responses
3. Implement persistent storage for conversations
4. Add analytics and monitoring
5. Plan for production deployment

---

**Need Help?**

Check the Troubleshooting section in [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)
