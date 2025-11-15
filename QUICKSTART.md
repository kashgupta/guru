# Quick Start: Conversation State Setup

This is a quick 5-minute guide to get conversation state working.

## Prerequisites

✅ OpenAI API key (already set in `.env`)
✅ Supabase project (already set in `.env`)
✅ `@supabase/supabase-js` installed (already installed)

## Setup Steps

### 1. Create the Database Table (2 minutes)

```bash
# Option A: Automated test (recommended)
cd backend
node setup-supabase.js

# This will show you the SQL to copy/paste into Supabase
```

```bash
# Option B: Manual setup
# 1. Go to: https://app.supabase.com/project/_/editor
# 2. Click "SQL Editor" in the left sidebar
# 3. Copy all contents from backend/schema.sql
# 4. Paste into the editor
# 5. Click "Run" button
```

### 2. Verify Setup (1 minute)

```bash
# Run the test script again
cd backend
node setup-supabase.js

# You should see:
# ✅ Connected to Supabase successfully!
# ✅ All operations completed successfully!
```

### 3. Test with WhatsApp (2 minutes)

```bash
# Start the backend
npm start

# Send a WhatsApp message to your Twilio number
# Message: "I have a medical bill question"

# Check logs - you should see:
# 🆕 Creating new conversation session
# 🔑 Conversation ID: conv_abc123
# ✅ Conversation saved successfully

# Send another message
# Message: "Tell me more"

# Check logs - you should see:
# 📜 Resuming existing conversation: conv_abc123
```

## Verify It's Working

### Check Supabase Dashboard

1. Go to: https://app.supabase.com/project/_/editor
2. Click "Table Editor" → "user_conversations"
3. You should see your phone number and conversation ID

### Check Logs

First message logs:
```
🔍 Looking up conversation in Supabase...
   Existing conversation ID: None
🆕 Creating new conversation session
💾 Saving conversation to Supabase...
✅ Conversation saved successfully
```

Second message logs:
```
🔍 Looking up conversation in Supabase...
   Existing conversation ID: conv_abc123
📜 Resuming existing conversation: conv_abc123
```

## That's It!

Your conversation state is now working. Users can:
- Have continuous conversations across multiple messages
- Return days later and continue where they left off
- Switch topics while maintaining context

## Troubleshooting

**Problem**: "Supabase not initialized"
**Fix**: Check `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`

**Problem**: "Table does not exist"
**Fix**: Run the SQL from `backend/schema.sql` in Supabase

**Problem**: Conversations not resuming
**Fix**: Check logs for "Existing conversation ID: conv_..." (should not be "None")

## Next Steps

- Review [CONVERSATION_STATE_SETUP.md](CONVERSATION_STATE_SETUP.md) for detailed docs
- Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for architecture
- Monitor Supabase dashboard to see conversations in real-time

## Files Created

- ✅ `backend/schema.sql` - Database schema
- ✅ `backend/supabase.js` - Supabase client
- ✅ `backend/setup-supabase.js` - Setup script
- ✅ `backend/agent.js` - Updated with Session support
- ✅ `backend/whatsapp.js` - Updated with Supabase integration

---

**Ready to test!** 🚀
