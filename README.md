# guru
Healthcare guru, financial guru, legal guru for immigrants who are new to the system

## Features

- **Speech-to-Speech Architecture**: Native audio handling using `gpt-4o-realtime-preview`
- **WebRTC Transport**: Low-latency peer-to-peer communication optimized for browser
- **Real-time Transcription**: See what you and the AI are saying
- **Audio Visualization**: Visual feedback during conversation
- **Secure API Key Handling**: Server-side token generation keeps your API key safe
- **Multi-Agent Support**: Custom agents for healthcare, financial, and legal domains

## Project Structure

This project consists of two parts:

### Frontend (Next.js)
A Next.js application with a chat interface for interacting with the agents.

**Setup:**
```bash
cd frontend
npm install
npm run dev
```

### Backend (Claude Agents SDK)
A Node.js backend service using Claude Agents SDK with custom agents for healthcare, financial, and legal domains.

**Setup:**
```bash
cd backend
npm install
export ANTHROPIC_API_KEY=your_api_key_here
npm start
```

See the [backend README](./backend/README.md) for more details.

## Prerequisites

- Node.js 18+ installed
- OpenAI API key with access to Realtime API (for voice features)
- Anthropic API key (for Claude agents)
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone access (for voice features)

## Setup

### 1. Install Dependencies

For the root project:
```bash
npm install
```

For frontend:
```bash
cd frontend
npm install
```

For backend:
```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
API_PORT=3001
```

For backend, set:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Start the Application

**Frontend:**
```bash
cd frontend
npm run dev
```

**Backend:**
```bash
cd backend
npm start
```

## Usage

1. Start both frontend and backend services
2. Navigate to the frontend URL (typically http://localhost:3000)
3. Use the chat interface to interact with healthcare, financial, or legal agents
4. For voice features, click the **Connect** button to establish connection with OpenAI's Realtime API

## Architecture

This application uses:
- **Next.js** for the frontend with a modern chat interface
- **Claude Agents SDK** for domain-specific agent responses
- **OpenAI Realtime API** for voice interactions (optional)
- **WebRTC** for low-latency browser communication

## Customization

### Modify Agent Personality

Edit the agent instructions in the backend to customize:
- Identity and character
- Tone and demeanor
- Formality level
- Domain-specific knowledge

### Change Voice

Modify the `voice` parameter in voice agent configuration:
```javascript
voice: 'verse',  // Options: alloy, echo, fable, onyx, nova, shimmer, verse
```

## Troubleshooting

### "OPENAI_API_KEY not configured"
Make sure you've created a `.env` file with your API key.

### "ANTHROPIC_API_KEY not configured"
Make sure you've exported the environment variable for the backend.

### No microphone access
Check browser permissions and ensure you're using HTTPS or localhost.

### Connection fails
- Verify your API keys are valid
- Check that you have access to the required APIs
- Ensure you're not hitting rate limits

## Resources

- [OpenAI Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [Realtime API Reference](https://platform.openai.com/docs/api-reference/realtime)
- [Claude Agents SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!
