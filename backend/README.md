# Guru Backend

Backend agent service using Claude Agents SDK for providing healthcare, financial, and legal guidance to immigrants.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set your Claude API key:**
   ```bash
   export ANTHROPIC_API_KEY=your_api_key_here
   ```
   Get your API key from the [Claude Console](https://console.anthropic.com/).

## Usage

Run the agent:

```bash
npm start
# or
node agent.js
```

This demonstrates:
- Custom agents for healthcare, financial, and legal advice
- Custom system prompts
- Multiple domain-specific queries

## Files

- `agent.js` - Main agent implementation with custom agents for healthcare, financial, and legal domains

## Documentation

For more information, see the [Claude Agents SDK documentation](https://docs.claude.com/en/api/agent-sdk/overview).

