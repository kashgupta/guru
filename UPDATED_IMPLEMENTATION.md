# Updated Conversation State Implementation

## Changes Made

We've updated the implementation to correctly use the **OpenAI Responses API** with `previous_response_id` for conversation state management.

## How It Works Now

### Architecture

```
User Message
    ↓
WhatsApp → Supabase (lookup response_id by phone)
    ↓
OpenAI Responses API
    ├─ First message: No previous_response_id
    │  └─ Returns response.id
    │
    └─ Subsequent messages: Include previous_response_id
       └─ OpenAI automatically loads conversation context
    ↓
Save response.id to Supabase
    ↓
Send response to user
```

### Key Implementation Details

#### 1. Responses API Parameters

```javascript
const responseParams = {
  model: "gpt-4o",
  input: [{ role: "user", content: userPrompt }],
  instructions: agentPrompt, // System instructions
  store: true, // Enable 30-day retention
};

// If continuing conversation
if (conversationId) {
  responseParams.previous_response_id = conversationId;
}

const response = await openai.responses.create(responseParams);
```

#### 2. Response Format

```javascript
// Extract text
const text = response.output_text;

// Get response ID for next turn
const responseId = response.id;

// Usage stats
const usage = response.usage;
console.log(usage.input_tokens, usage.output_tokens, usage.total_tokens);
```

#### 3. Conversation Flow

**First Message:**
```javascript
// User: "I have a medical bill"
const response = await openai.responses.create({
  model: "gpt-4o",
  input: [{ role: "user", content: "I have a medical bill" }],
  instructions: "You are a healthcare advisor...",
  store: true,
});

// Save response.id (e.g., "resp_abc123") to Supabase
await saveConversation(phoneNumber, response.id, "healthcare");
```

**Second Message:**
```javascript
// User: "What about payment plans?"
// Lookup returns: conversationId = "resp_abc123"

const response = await openai.responses.create({
  model: "gpt-4o",
  previous_response_id: "resp_abc123", // Link to previous response
  input: [{ role: "user", content: "What about payment plans?" }],
  instructions: "You are a healthcare advisor...",
  store: true,
});

// Model automatically has context from first message
// Update Supabase with new response.id
await saveConversation(phoneNumber, response.id, "healthcare");
```

## Benefits of Responses API

### 1. Automatic Context Management
- OpenAI automatically loads previous conversation context
- No need to manually pass full conversation history
- Reduces token usage (you only send new message)

### 2. Server-Side Storage
- Responses stored for 30 days (with `store: true`)
- Can be retrieved via API or dashboard
- Accessible at https://platform.openai.com/logs?api=responses

### 3. Simple State Chaining
```javascript
// Just pass the previous response ID
{ previous_response_id: "resp_abc123" }

// Instead of manually building history:
{
  messages: [
    { role: "user", content: "message 1" },
    { role: "assistant", content: "response 1" },
    { role: "user", content: "message 2" },
    { role: "assistant", content: "response 2" },
    { role: "user", content: "message 3" },
  ]
}
```

### 4. Billing
- All previous input tokens are billed as input tokens
- But you don't have to send them in each request
- OpenAI retrieves them server-side

## File Changes

### Modified: `backend/agent.js`

**Before:**
- Used `@openai/agents` SDK with `Session` (doesn't exist)
- Tried to manually manage conversation history

**After:**
- Uses OpenAI Responses API directly
- Passes `previous_response_id` for conversation continuity
- Returns `response.id` as `conversationId`

**Key code:**
```javascript
import OpenAI from 'openai';

// Create response with optional previous_response_id
const response = await openai.responses.create({
  model: agent.model,
  input: [{ role: "user", content: userPrompt }],
  instructions: agent.prompt,
  store: true,
  ...(conversationId && { previous_response_id: conversationId }),
});

// Extract response
const text = response.output_text;
const newConversationId = response.id;
```

### Unchanged: `backend/whatsapp.js`

- Still calls `getConversation()` to lookup response ID
- Still calls `saveConversation()` to save response ID
- Works the same way, just stores `response.id` instead

### Unchanged: `backend/supabase.js`

- Same database schema
- Same functions
- `conversation_id` now stores response IDs (e.g., "resp_abc123")

## Testing

### 1. Start Backend

```bash
cd backend
npm start
```

### 2. Send First WhatsApp Message

```
User: "I have a medical bill question"
```

**Expected Logs:**
```
🆕 Creating new conversation
🔑 Conversation ID: resp_abc123...
💾 Saving conversation to Supabase...
✅ Conversation saved successfully
```

### 3. Send Second WhatsApp Message

```
User: "What about payment plans?"
```

**Expected Logs:**
```
🔍 Looking up conversation in Supabase...
   Existing conversation ID: resp_abc123...
📜 Resuming existing conversation: resp_abc123...
🔑 Conversation ID: resp_def456...
💾 Saving conversation to Supabase...
✅ Conversation saved successfully
```

### 4. Verify Context

The model should respond to "What about payment plans?" with full context from the first message about the medical bill.

### 5. Check Supabase

```sql
SELECT * FROM user_conversations;
```

Should show:
```
phone_number     | conversation_id | last_agent  | last_activity
+1234567890      | resp_def456...  | healthcare  | 2025-11-15 ...
```

## API Reference

### OpenAI Responses API

```javascript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// First turn
const response1 = await openai.responses.create({
  model: "gpt-4o-mini",
  input: "tell me a joke",
  store: true,
});

console.log(response1.output_text);
console.log(response1.id); // e.g., "resp_abc123"

// Second turn (with context)
const response2 = await openai.responses.create({
  model: "gpt-4o-mini",
  previous_response_id: response1.id,
  input: [{ role: "user", content: "explain why this is funny" }],
  store: true,
});

console.log(response2.output_text); // Has full context
```

### Response Object Structure

```javascript
{
  id: "resp_abc123",
  object: "response",
  created: 1731664821,
  model: "gpt-4o-2024-08-06",
  output_text: "The assistant's response text...",
  output: [
    {
      id: "msg_abc123",
      role: "assistant",
      content: "The response content...",
    }
  ],
  usage: {
    input_tokens: 150,
    output_tokens: 50,
    total_tokens: 200,
  },
}
```

## Troubleshooting

### "responses.create is not a function"

**Problem:** Old OpenAI SDK version

**Solution:**
```bash
cd backend
npm install openai@latest
```

### "Invalid previous_response_id"

**Problem:** Response ID doesn't exist or expired (30 days)

**Solution:**
- Check Supabase has valid response ID
- If expired, the system will automatically create a new conversation
- User can send another message to start fresh

### Context Not Resuming

**Problem:** Model doesn't have context from previous message

**Check:**
1. Verify `previous_response_id` is being passed
2. Check logs: Should see "Resuming existing conversation: resp_..."
3. Verify response ID exists in Supabase
4. Check response ID hasn't expired (30 days)

## Data Retention

- **Response objects:** 30 days (with `store: true`)
- **Supabase records:** Cleaned up after 30 days of inactivity
- **OpenAI logs:** View at https://platform.openai.com/logs?api=responses

## Cost Optimization

### Token Usage

```
First message:  150 input + 50 output = 200 tokens
Second message: 150 + 50 + 100 input + 50 output = 350 tokens
                ↑ Previous context (billed as input)
```

Even though you don't manually send previous messages, they're still billed as input tokens.

### Best Practices

1. Use `gpt-4o-mini` for simple conversations ($0.150/1M input)
2. Use `gpt-4o` for complex reasoning ($2.50/1M input)
3. Implement conversation limits (e.g., max 10 turns)
4. Clean up old conversations (we do this automatically)

## Next Steps

1. ✅ Test with WhatsApp messages
2. Monitor OpenAI dashboard for response logs
3. Check Supabase for stored response IDs
4. Verify conversation continuity works
5. Monitor token usage and costs

## References

- [OpenAI Conversation State Guide](https://platform.openai.com/docs/guides/conversation-state?api-mode=responses)
- [Responses API Reference](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI Response Logs](https://platform.openai.com/logs?api=responses)
