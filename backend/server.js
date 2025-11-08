import express from 'express';
import cors from 'cors';
import { runAgent, routeToAgent } from './agent.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Guru backend API is running' });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Please provide a valid prompt string',
      });
    }

    console.log(`\n📥 Received prompt: "${prompt}"`);

    // Route to the appropriate agent
    console.log('🔀 Routing to appropriate agent...');
    const selectedAgent = await routeToAgent(prompt);
    console.log(`✅ Selected agent: ${selectedAgent}`);

    // Run the agent with the user prompt
    const result = await runAgent(selectedAgent, prompt, { silent: false });

    // Return the response
    res.json({
      success: true,
      agent: selectedAgent,
      response: result.response,
      metadata: {
        duration_ms: result.duration_ms,
        cost_usd: result.cost_usd,
        usage: result.usage,
      },
    });
  } catch (error) {
    console.error('❌ Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Guru Backend API server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
});

