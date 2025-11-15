# Conversation State Setup Guide

This guide explains how to set up persistent conversation state for WhatsApp users using OpenAI's Conversation State API and Supabase.

## Overview

The system now stores user conversations persistently:
- **OpenAI Conversations API**: Stores the actual conversation history and context
- **Supabase**: Maps phone numbers to OpenAI conversation IDs
- **Session Management**: Automatically resumes conversations when users return

## Architecture

```
User WhatsApp Message
    ↓
Twilio Webhook
    ↓
whatsapp.js (gets phone number)
    ↓
Supabase (lookup conversation_id by phone_number)
    ↓
agent.js (creates/resumes Session with conversation_id)
    ↓
OpenAI Agents SDK (manages conversation state)
    ↓
Returns response + conversation_id
    ↓
Supabase (saves conversation_id for phone_number)
    ↓
Send WhatsApp response to user
```

## Setup Steps

### 1. Create Supabase Table

Run the SQL schema in your Supabase project:

```bash
# Option A: Using Supabase Dashboard
1. Go to https://app.supabase.com/project/YOUR_PROJECT/editor
2. Open SQL Editor
3. Copy and paste the contents of backend/schema.sql
4. Click "Run"

# Option B: Using Supabase CLI
supabase db push
```

The schema creates:
- `user_conversations` table with phone number → conversation ID mapping
- Indexes for fast lookups
- Auto-update triggers for `updated_at` timestamp

### 2. Verify Environment Variables

Make sure your `.env` file has:

```env
# OpenAI API Key (required)
OPENAI_API_KEY=sk-proj-...

# Supabase Configuration (required)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Test the Setup

```bash
# Start the backend
cd backend
npm start

# The system will:
# - Connect to Supabase on startup
# - Create/resume conversations automatically
# - Log all conversation state operations
```

## How It Works

### First Message from User

1. User sends WhatsApp message: "I have a medical bill question"
2. System looks up phone number in Supabase: **No conversation found**
3. System creates new OpenAI Session (no conversationId)
4. Agent routes to healthcare agent
5. OpenAI generates response and returns `conversationId: "conv_abc123"`
6. System saves to Supabase: `{ phone: "+1234567890", conversationId: "conv_abc123", lastAgent: "healthcare" }`

### Subsequent Messages

1. User sends: "What about payment plans?"
2. System looks up phone number: **Found `conversationId: "conv_abc123"`**
3. System creates Session with existing `conversationId`
4. OpenAI resumes previous conversation with full context
5. Agent responds with context-aware answer
6. System updates `last_activity` in Supabase

## Key Features

### Automatic Conversation Continuity
- Users can return days later and continue their conversation
- Context is preserved across all messages
- No need to repeat information

### Multi-Agent Support
- Each user can have one active conversation
- Conversations can span multiple agents (healthcare → financial)
- Agent routing happens per message

### Data Retention
- In-memory sessions: Cleaned up after 1 hour of inactivity
- Supabase records: Cleaned up after 30 days of inactivity
- OpenAI conversations: Retained for 30 days (OpenAI policy)

### Privacy & Security
- Phone numbers are stored as-is (without 'whatsapp:' prefix)
- Only conversation IDs are stored in Supabase
- Actual conversation content is stored by OpenAI
- Conversations can be deleted via `deleteConversation(phoneNumber)`

## API Reference

### Supabase Functions

```javascript
import { getConversation, saveConversation, deleteConversation } from './supabase.js';

// Get existing conversation
const { conversationId, lastAgent } = await getConversation('+1234567890');

// Save/update conversation
await saveConversation('+1234567890', 'conv_abc123', 'healthcare');

// Delete conversation (for testing/user request)
await deleteConversation('+1234567890');
```

### Agent Functions

```javascript
import { runAgent } from './agent.js';

// New conversation
const result = await runAgent('healthcare', 'I need help with a medical bill', {
  conversationId: null, // or omit
});

// Continue conversation
const result = await runAgent('healthcare', 'What about payment plans?', {
  conversationId: 'conv_abc123',
});

console.log(result.conversationId); // Use this for next message
```

## Troubleshooting

### "Supabase not initialized" Warning

**Problem**: Missing or invalid Supabase credentials

**Solution**: Check your `.env` file has valid `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### "No existing conversation found" (Unexpected)

**Problem**: Conversation was cleaned up or deleted

**Solution**: This is normal if:
- User hasn't chatted in 30+ days
- Table was recently created
- Manual deletion occurred

### Conversations Not Resuming

**Problem**: New conversation starts each time

**Check**:
1. Verify table exists: `SELECT * FROM user_conversations;`
2. Check logs for "Existing conversation ID: conv_..."
3. Verify phone number format matches (should be without 'whatsapp:')

### Session/Agent Errors

**Problem**: "Session is not defined" or similar

**Solution**: Make sure you're using `@openai/agents` SDK version that supports Sessions. Update if needed:

```bash
cd backend
npm install @openai/agents@latest
```

## Database Schema

```sql
CREATE TABLE user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  conversation_id VARCHAR(255),
  last_agent VARCHAR(50),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Testing

### Manual Testing via WhatsApp

1. Send a message: "I have a medical bill"
2. Check logs for: `New conversation ID: conv_...`
3. Send another message: "Tell me more"
4. Check logs for: `Resuming existing conversation: conv_...`

### Testing via Supabase Dashboard

```sql
-- View all conversations
SELECT * FROM user_conversations ORDER BY last_activity DESC;

-- View specific user
SELECT * FROM user_conversations WHERE phone_number = '+1234567890';

-- Delete test conversation
DELETE FROM user_conversations WHERE phone_number = '+1234567890';
```

## Monitoring

### Logs to Watch

```
🔍 [ASYNC PROCESSOR] Looking up conversation in Supabase...
   Existing conversation ID: conv_abc123
   Last agent used: healthcare

🤖 [AGENT:HEALTHCARE] Creating new conversation session
   OR
📜 [AGENT:HEALTHCARE] Resuming existing conversation: conv_abc123

💾 [ASYNC PROCESSOR] Saving conversation to Supabase...
✅ [SUPABASE] Conversation saved successfully
```

### Cleanup Jobs

The system runs two cleanup jobs:
- **In-memory sessions**: Every 10 minutes (1 hour timeout)
- **Supabase conversations**: Every 24 hours (30 days timeout)

Check logs for:
```
🧹 Cleaned up in-memory session for +1234567890
🧹 [SUPABASE] Cleaned up 5 old conversations
```

## Next Steps

1. ✅ Create the Supabase table using `schema.sql`
2. ✅ Verify environment variables are set
3. ✅ Start the backend and test with WhatsApp
4. ✅ Monitor logs to confirm conversation state is working
5. Consider adding analytics on conversation metrics
6. Consider adding user management endpoints (view/delete conversations)

## Support

If you encounter issues:
1. Check the logs for detailed error messages
2. Verify Supabase table exists and has correct schema
3. Ensure OpenAI API key has access to Conversations API
4. Check that @openai/agents SDK is up to date
