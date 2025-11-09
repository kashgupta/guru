import { Agent, run } from '@openai/agents';

/**
 * OpenAI Agents SDK implementation for:
 * 1. Custom agents for different domains (healthcare, financial, legal)
 * 2. Agent routing based on user queries
 * 3. Conversation history support
 * 4. Using OpenAI Responses API
 */

// Define custom agents for different domains
const agents = {
  healthcare: {
    description: 'A healthcare advisor specializing in helping immigrants navigate the US healthcare system, including medical bill negotiation',
    prompt: `You are a compassionate healthcare advisor helping immigrants understand:
- How to find affordable healthcare options
- Understanding health insurance in the US
- Finding community health centers
- Emergency healthcare procedures
- Preventive care and vaccinations
- Medical bill negotiation and financial assistance
Always provide clear, actionable advice in simple language.`,
    model: 'gpt-4o',
  },
  financial: {
    description: 'A financial advisor helping immigrants with banking, credit, and financial planning',
    prompt: `You are a financial advisor specializing in helping immigrants:
- Open bank accounts
- Build credit history
- Understand taxes
- Save money and budget
- Access financial resources
Provide practical, step-by-step guidance.`,
    model: 'gpt-4o',
  },
  legal: {
    description: 'A legal advisor helping immigrants understand their rights and legal processes',
    prompt: `You are a legal advisor helping immigrants with:
- Immigration paperwork and processes
- Understanding legal rights
- Finding legal resources
- Document requirements
- Important deadlines
Always clarify that you provide general information, not legal advice, and recommend consulting an attorney for specific cases.`,
    model: 'gpt-4o',
  },
};

// Create agent instances
const agentInstances = {};

function getAgent(agentName) {
  if (!agentInstances[agentName]) {
    const agentConfig = agents[agentName];
    if (!agentConfig) {
      throw new Error(`Unknown agent: ${agentName}`);
    }

    agentInstances[agentName] = new Agent({
      name: agentName,
      model: agentConfig.model,
      instructions: agentConfig.prompt,
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return agentInstances[agentName];
}

/**
 * Run an agent with user prompt and optional conversation history
 * @param {string} agentName - The agent to run (healthcare, financial, legal)
 * @param {string} userPrompt - The user's message
 * @param {Object} options - Additional options
 * @param {boolean} options.silent - Suppress console output
 * @param {Array} options.conversationHistory - Array of previous messages [{role, content}]
 * @returns {Promise<Object>} Response object with agent response and metadata
 */
async function runAgent(agentName, userPrompt, options = {}) {
  const { silent = false, conversationHistory = [] } = options;

  if (!silent) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 ${agentName.toUpperCase()} AGENT`);
    console.log('='.repeat(60));
    console.log(`User: ${userPrompt}\n`);
  }

  const agent = agents[agentName];
  if (!agent) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  try {
    const startTime = Date.now();

    // Get or create agent instance
    const agentInstance = getAgent(agentName);

    // Build the prompt with conversation history if provided
    let fullPrompt = userPrompt;
    if (conversationHistory.length > 0) {
      // Format conversation history for context
      const historyText = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent question: ${userPrompt}`;
    }

    // Run the agent using the SDK's run() function
    const response = await run(agentInstance, fullPrompt);

    const duration_ms = Date.now() - startTime;

    // Extract the assistant's response
    const assistantMessage = response.finalOutput || '';

    if (!silent && assistantMessage) {
      console.log(`💬 ${agentName} Advisor: ${assistantMessage}\n`);
      console.log(`✅ Completed (${duration_ms}ms)`);
    }

    // Calculate approximate cost (rough estimate based on token usage)
    const usage = response.usage || {};
    const inputCost = (usage.inputTokens || 0) * 0.0000025; // $2.50/1M tokens for GPT-4o
    const outputCost = (usage.outputTokens || 0) * 0.000010; // $10/1M tokens for GPT-4o
    const cost_usd = inputCost + outputCost;

    return {
      response: assistantMessage,
      agent: agentName,
      success: true,
      duration_ms,
      cost_usd,
      usage: {
        input_tokens: usage.inputTokens || 0,
        output_tokens: usage.outputTokens || 0,
        total_tokens: usage.totalTokens || 0,
      },
      conversationId: response.conversationId || null,
    };
  } catch (error) {
    if (!silent) {
      console.error(`❌ Error with ${agentName} agent:`, error.message);
    }

    return {
      response: `I apologize, but I encountered an error processing your request. Please try again.`,
      agent: agentName,
      success: false,
      duration_ms: 0,
      cost_usd: 0,
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      error: error.message,
    };
  }
}

/**
 * Routes a user prompt to the most appropriate agent
 * Uses OpenAI to determine which agent (healthcare, financial, or legal) is best suited
 */
async function routeToAgent(userPrompt) {
  const routingPrompt = `You are a routing assistant. Analyze the following user question and determine which specialized agent should handle it.

Available agents:
1. healthcare - For questions about health insurance, medical care, healthcare access, vaccinations, emergency care, preventive care, medical bills
2. financial - For questions about banking, credit, taxes, budgeting, financial planning, opening accounts
3. legal - For questions about immigration paperwork, visas, legal rights, document requirements, legal processes

User question: "${userPrompt}"

Respond with ONLY one word: "healthcare", "financial", or "legal". Do not include any explanation or additional text.`;

  try {
    // Use a simple OpenAI call for routing
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use mini for cost-effective routing
      messages: [
        { role: 'system', content: 'You are a routing assistant. Respond with only one word.' },
        { role: 'user', content: routingPrompt }
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const routingResponse = completion.choices[0].message.content.trim().toLowerCase();

    // Validate and normalize the response
    const validAgents = ['healthcare', 'financial', 'legal'];
    const selectedAgent = validAgents.find(agent =>
      routingResponse?.includes(agent)
    ) || 'healthcare'; // Default to healthcare if unclear

    return selectedAgent;
  } catch (error) {
    console.error('Error routing to agent:', error.message);
    // Default to healthcare on error
    return 'healthcare';
  }
}

export { runAgent, agents, routeToAgent };
