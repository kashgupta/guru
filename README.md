# OpenAI Voice Agent - Browser Implementation

A browser-based speech-to-speech voice agent using OpenAI's Realtime API with WebRTC. This implementation follows OpenAI's recommended architecture for building interactive voice agents.

## Features

- **Speech-to-Speech Architecture**: Native audio handling using `gpt-4o-realtime-preview`
- **WebRTC Transport**: Low-latency peer-to-peer communication optimized for browser
- **Real-time Transcription**: See what you and the AI are saying
- **Audio Visualization**: Visual feedback during conversation
- **Secure API Key Handling**: Server-side token generation keeps your API key safe

## Architecture

This application uses the **speech-to-speech (S2S) architecture** which:
- Directly processes audio inputs and outputs
- Handles speech in real-time with a single multimodal model
- Understands emotion, intent, and filters out noise
- Responds naturally without relying on text transcripts

## Prerequisites

- Node.js 18+ installed
- OpenAI API key with access to Realtime API
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone access

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
API_PORT=3001
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Start the Application

Run both the Vite dev server and API server with one command:

```bash
npm start
```

This will start:
- Vite dev server on `http://localhost:5173`
- API server on `http://localhost:3001`

If you prefer to run them separately:
- **Terminal 1:** `npm run dev` (Vite)
- **Terminal 2:** `npm run server` (API)

### 4. Open in Browser

Navigate to: http://localhost:5173

## Usage

1. Click the **Connect** button to establish connection with OpenAI's Realtime API
2. Allow microphone access when prompted by your browser
3. Start speaking naturally - the AI will respond in real-time
4. The conversation transcript will appear in the interface
5. Click **Disconnect** when you're done

## How It Works

### Client-Side (Browser)
- `index.html`: User interface with controls and visualization
- `app.js`: RealtimeAgent setup and event handling using `@openai/agents`
- Automatically uses WebRTC for low-latency browser communication

### Server-Side (Node.js)
- `server.js`: Express server that:
  - Serves static files
  - Generates ephemeral tokens for secure API access
  - Keeps your API key private (never exposed to browser)

### Security
The server creates ephemeral session tokens using the OpenAI Realtime Sessions API. Your API key never leaves the server or gets exposed to the browser.

## Customization

### Modify Agent Personality

Edit the `instructions` in `app.js:85-120` to customize:
- Identity and character
- Tone and demeanor
- Formality level
- Use of filler words
- Response pacing

Example:
```javascript
instructions: `You are a helpful coding tutor.

# Personality and Tone
## Identity
You are an experienced software engineer who loves teaching.

## Task
Help students learn programming concepts through clear explanations.

## Tone
Patient and encouraging
...`
```

### Change Voice

In `server.js:34`, modify the `voice` parameter:
```javascript
voice: 'verse',  // Options: alloy, echo, fable, onyx, nova, shimmer, verse
```

### Adjust Turn Detection

In `server.js:39-44`, tune the Voice Activity Detection (VAD):
```javascript
turn_detection: {
    type: 'server_vad',
    threshold: 0.5,              // Sensitivity (0.0-1.0)
    prefix_padding_ms: 300,      // Include audio before speech
    silence_duration_ms: 500     // Wait time before turn ends
}
```

### Add Function Tools

You can extend the agent with custom tools. See the [OpenAI documentation](https://platform.openai.com/docs/guides/voice-agents) for examples.

## Project Structure

```
.
├── index.html          # User interface
├── app.js              # Client-side agent logic
├── server.js           # Express server & API proxy
├── package.json        # Dependencies
├── .env.example        # Environment template
└── README.md           # This file
```

## Troubleshooting

### "OPENAI_API_KEY not configured"
Make sure you've created a `.env` file with your API key.

### No microphone access
Check browser permissions and ensure you're using HTTPS or localhost.

### Connection fails
- Verify your API key is valid
- Check that you have access to the Realtime API
- Ensure you're not hitting rate limits

### Audio issues
- Check microphone is working in browser settings
- Try a different browser
- Ensure no other app is using the microphone

## Resources

- [OpenAI Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [Realtime API Reference](https://platform.openai.com/docs/api-reference/realtime)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [Example Applications](https://github.com/openai/openai-realtime-api-beta)

## API Costs

The Realtime API pricing includes:
- Audio input/output
- Text tokens
- Transcription (if enabled)

Check current pricing: https://openai.com/api/pricing/

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!
