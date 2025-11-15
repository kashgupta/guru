# Webapp Conversation State Implementation

## Overview

The webapp now uses the same conversation state management as WhatsApp:
- OpenAI Responses API with `previous_response_id`
- Supabase for storing phone number → conversation ID mappings
- Automatic conversation continuity

## Changes Made

### Backend: `server.js`

**Updated `/api/chat` endpoint:**

1. **Added Supabase lookup** - If phone number provided, lookup existing conversation
2. **Pass conversation ID to agent** - Use `conversationId` instead of manual `conversationHistory`
3. **Save conversation ID** - Store response ID in Supabase after agent completes
4. **Return conversation ID** - Send it back to frontend for tracking

### Key Code Changes

```javascript
// Before
const result = await runAgent(selectedAgent, prompt, {
  silent: false,
  files: files,
  conversationHistory: history  // ❌ Old way
});

// After
const result = await runAgent(selectedAgent, prompt, {
  silent: false,
  files: files,
  conversationId: existingConversationId  // ✅ New way
});
```

## How It Works

### First Message from Webapp

```
User enters phone: +1234567890
User sends: "I have a medical bill question"
    ↓
Backend receives: { prompt, phoneNumber }
    ↓
Lookup in Supabase: No conversation found
    ↓
Create response without previous_response_id
    ↓
OpenAI returns: response.id = "resp_abc123"
    ↓
Save to Supabase: { +1234567890 → resp_abc123 }
    ↓
Return to frontend: { response, conversationId: "resp_abc123" }
```

### Second Message from Webapp

```
User sends: "What about payment plans?"
    ↓
Backend receives: { prompt, phoneNumber }
    ↓
Lookup in Supabase: Found resp_abc123
    ↓
Create response with previous_response_id: "resp_abc123"
    ↓
OpenAI returns: response with full context from first message
    ↓
Update Supabase: { +1234567890 → resp_def456 }
    ↓
Return to frontend: { response, conversationId: "resp_def456" }
```

## Frontend Integration

### What to Update

The frontend needs to send the phone number with each chat request:

```typescript
// Current frontend code (example)
const response = await fetch('/api/chat', {
  method: 'POST',
  body: formData.append('prompt', userMessage)
});

// Updated to include phone number
const response = await fetch('/api/chat', {
  method: 'POST',
  body: formData.append('prompt', userMessage)
              .append('phoneNumber', userPhoneNumber) // Add this
});
```

### Frontend Flow

1. **Store phone number** - When user enters phone on landing page, store it in state/localStorage
2. **Send with each message** - Include `phoneNumber` in every `/api/chat` request
3. **Optional: Track conversation ID** - Frontend can track `conversationId` from response for debugging

### Example Frontend Update

```typescript
// Store phone number after submission
const handlePhoneSubmit = async (phone: string) => {
  await fetch('/api/submit-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: phone }),
  });

  // Store for later use
  localStorage.setItem('userPhone', phone);
  setPhoneNumber(phone);
};

// Include phone in chat requests
const handleSendMessage = async (message: string) => {
  const formData = new FormData();
  formData.append('prompt', message);
  formData.append('phoneNumber', phoneNumber); // From state or localStorage

  const response = await fetch('/api/chat', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  // data.conversationId available for tracking
};
```

## Benefits

### For Users
- ✅ **Continuous conversations** across sessions
- ✅ **No need to repeat context**
- ✅ **Same phone number** = same conversation history
- ✅ **Works across devices** (as long as same phone number)

### For Developers
- ✅ **Simple API** - just include `phoneNumber`
- ✅ **No manual history management** - OpenAI handles it
- ✅ **Consistent with WhatsApp** - same implementation
- ✅ **Automatic cleanup** - old conversations removed after 30 days

### For System
- ✅ **Efficient** - only stores response IDs
- ✅ **Scalable** - Supabase handles millions of users
- ✅ **Cost-effective** - no duplicate context storage

## API Response Format

### Before

```json
{
  "success": true,
  "agent": "healthcare",
  "response": "I can help you with that medical bill...",
  "metadata": {
    "duration_ms": 1234,
    "cost_usd": 0.002,
    "usage": { ... }
  }
}
```

### After (New Fields)

```json
{
  "success": true,
  "agent": "healthcare",
  "response": "I can help you with that medical bill...",
  "conversationId": "resp_abc123",  // ← NEW: Track this
  "metadata": {
    "duration_ms": 1234,
    "cost_usd": 0.002,
    "usage": { ... }
  }
}
```

## Testing

### 1. Without Phone Number (Still Works)

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'

# Creates new conversation each time (no state persistence)
```

### 2. With Phone Number (Conversation State)

```bash
# First message
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "I have a medical bill question",
    "phoneNumber": "+1234567890"
  }'

# Returns: conversationId: "resp_abc123"

# Second message (has context from first)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What about payment plans?",
    "phoneNumber": "+1234567890"
  }'

# Model remembers the medical bill from first message
```

### 3. Check Supabase

```sql
SELECT * FROM user_conversations
WHERE phone_number = '+1234567890';

-- Should show:
-- conversation_id: resp_abc123 (or latest response ID)
-- last_agent: healthcare
-- last_activity: 2025-11-15 ...
```

## Database Schema

The webapp uses the same `user_conversations` table:

```sql
CREATE TABLE user_conversations (
  id UUID PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE,
  conversation_id VARCHAR(255),     -- Stores response IDs
  last_agent VARCHAR(50),
  last_activity TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Backwards Compatibility

### No Phone Number Provided

If frontend doesn't send `phoneNumber`, the system still works:
- Creates new conversation each time
- No state persistence
- Behaves like before (stateless)

### Migration Path

1. **Phase 1** - Backend updated (✅ Done)
2. **Phase 2** - Frontend sends phone number (To Do)
3. **Phase 3** - All users get conversation state

No breaking changes - fully backwards compatible!

## Troubleshooting

### "Conversation not resuming"

**Check:**
1. Frontend sending `phoneNumber` in request?
2. Supabase has `conversation_id` for that phone?
3. Backend logs show "Resuming existing conversation"?

### "New conversation each time"

**Cause:** Phone number not being sent or different phone each time

**Fix:** Ensure frontend consistently sends the same phone number

### "Response ID not saved"

**Check:**
1. Supabase credentials configured?
2. `user_conversations` table exists?
3. Backend logs show "Saving conversation to Supabase"?

## Next Steps

### Frontend Tasks

1. ✅ Update phone submission to store in state/localStorage
2. ✅ Include `phoneNumber` in all `/api/chat` requests
3. ✅ Optional: Display conversation continuity indicator
4. ✅ Optional: Add "Start new conversation" button

### Optional Enhancements

- **Conversation list** - Show user's past conversations
- **Conversation deletion** - Let users delete/reset conversations
- **Multi-conversation** - Support multiple conversation threads per user
- **Conversation export** - Let users download conversation history

## Summary

The webapp now has the same powerful conversation state management as WhatsApp:

| Feature | Before | After |
|---------|--------|-------|
| State management | Manual (frontend) | Automatic (OpenAI) |
| Storage | Frontend only | Supabase + OpenAI |
| Persistence | Session only | 30 days |
| Context limit | Limited | Full conversation |
| Multi-device | ❌ | ✅ (via phone number) |

**Status:** ✅ Backend Complete - Frontend Integration Needed
