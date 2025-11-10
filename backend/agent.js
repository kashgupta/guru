import { Agent, run } from '@openai/agents';

/**
 * OpenAI Agents SDK implementation for:
 * 1. Custom agents for different domains (healthcare, financial, legal, english, general)
 * 2. Agent routing based on user queries
 * 3. Conversation history support
 * 4. File analysis (images, PDFs, documents) via OpenAI Agents SDK
 * 5. Unified code path using Agents SDK for all requests
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
  english: {
    description: 'An English language learning assistant helping immigrants improve their English communication skills and understand English content',
    prompt: `You are a friendly and patient English language learning assistant helping immigrants:
- Learn how to have specific conversations in English (e.g., talking to doctors, employers, landlords, customer service)
- Practice common English phrases and expressions for everyday situations
- Understand the meaning of English text in pictures, documents, forms, and signs
- Explain English idioms, slang, and cultural expressions
- Provide pronunciation tips and grammar explanations when needed
- Help translate and explain official documents, letters, or notices written in English
- Teach practical English for daily life in the US

When analyzing images or documents:
- Clearly explain what the text says in simple terms
- Translate key information if needed
- Explain any important terms or concepts
- Provide context about what action might be needed (if it's a bill, form, notice, etc.)

Always be encouraging, patient, and explain things in simple, clear language. Break down complex English into easy-to-understand terms.`,
    model: 'gpt-4o',
  },
  general: {
    description: 'A general-purpose assistant for questions outside the specialized domains',
    prompt: `You are a helpful assistant. The folks you are often helping are often immigrants and often don't speak English.`,
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
 * @param {string} agentName - The agent to run (healthcare, financial, legal, english, general)
 * @param {string} userPrompt - The user's message
 * @param {Object} options - Additional options
 * @param {boolean} options.silent - Suppress console output
 * @param {Array} options.conversationHistory - Array of previous messages [{role, content}]
 * @param {Array} options.files - Array of uploaded files (multer file objects)
 * @returns {Promise<Object>} Response object with agent response and metadata
 */
async function runAgent(agentName, userPrompt, options = {}) {
  const { silent = false, conversationHistory = [], files = [] } = options;

  console.log('\n' + '='.repeat(80));
  console.log(`🤖 [AGENT:${agentName.toUpperCase()}] Starting agent execution`);
  console.log('='.repeat(80));
  console.log(`   Prompt: "${userPrompt}"`);
  console.log(`   Files: ${files.length}`);
  console.log(`   Conversation history: ${conversationHistory.length} messages`);
  console.log(`   Silent mode: ${silent}`);

  const agent = agents[agentName];
  if (!agent) {
    console.error(`❌ [AGENT:${agentName.toUpperCase()}] Unknown agent: ${agentName}`);
    throw new Error(`Unknown agent: ${agentName}`);
  }

  console.log(`✅ [AGENT:${agentName.toUpperCase()}] Agent configuration loaded`);
  console.log(`   Model: ${agent.model}`);
  console.log(`   Description: ${agent.description}`);

  try {
    const startTime = Date.now();
    console.log(`⏱️  [AGENT:${agentName.toUpperCase()}] Start time: ${new Date(startTime).toISOString()}`);

    // Get or create agent instance
    console.log(`🏗️  [AGENT:${agentName.toUpperCase()}] Getting agent instance...`);
    const agentInstance = getAgent(agentName);
    console.log(`✅ [AGENT:${agentName.toUpperCase()}] Agent instance ready`);

    // Build the prompt with conversation history if provided
    let fullPrompt = userPrompt;
    if (conversationHistory.length > 0) {
      console.log(`📜 [AGENT:${agentName.toUpperCase()}] Adding conversation history to prompt...`);
      // Format conversation history for context
      const historyText = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      fullPrompt = `Previous conversation:\n${historyText}\n\nCurrent question: ${userPrompt}`;
    }

    // Convert multer files to File objects if present
    let fileObjects = [];
    if (files && files.length > 0) {
      console.log(`📎 [AGENT:${agentName.toUpperCase()}] Converting ${files.length} file(s) for Agents SDK...`);
      fileObjects = await Promise.all(
        files.map(async (file) => {
          return new File([file.buffer], file.originalname, { type: file.mimetype });
        })
      );
      console.log(`✅ [AGENT:${agentName.toUpperCase()}] Files converted successfully`);
    }

    console.log(`🚀 [AGENT:${agentName.toUpperCase()}] Running agent with prompt...`);
    console.log(`   Full prompt length: ${fullPrompt.length} characters`);

    // Run the agent using the SDK's run() function with files if present
    const runOptions = fileObjects.length > 0 ? { files: fileObjects } : {};
    const response = await run(agentInstance, fullPrompt, runOptions);

    const duration_ms = Date.now() - startTime;
    console.log(`⏱️  [AGENT:${agentName.toUpperCase()}] Agent completed in ${duration_ms}ms`);

    // Extract the assistant's response
    const assistantMessage = response.finalOutput || '';
    console.log(`📤 [AGENT:${agentName.toUpperCase()}] Response generated`);
    console.log(`   Response length: ${assistantMessage.length} characters`);
    console.log(`   Response preview: "${assistantMessage.substring(0, 100)}..."`);

    // Calculate approximate cost (rough estimate based on token usage)
    const usage = response.usage || {};
    console.log(`💰 [AGENT:${agentName.toUpperCase()}] Token usage:`);
    console.log(`   Input tokens: ${usage.inputTokens || 0}`);
    console.log(`   Output tokens: ${usage.outputTokens || 0}`);
    console.log(`   Total tokens: ${usage.totalTokens || 0}`);

    const inputCost = (usage.inputTokens || 0) * 0.0000025; // $2.50/1M tokens for GPT-4o
    const outputCost = (usage.outputTokens || 0) * 0.000010; // $10/1M tokens for GPT-4o
    const cost_usd = inputCost + outputCost;
    console.log(`   Estimated cost: $${cost_usd.toFixed(6)}`);

    console.log(`✅ [AGENT:${agentName.toUpperCase()}] Agent execution successful`);
    console.log('='.repeat(80) + '\n');

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
      files_processed: files ? files.length : 0,
      conversationId: response.conversationId || null,
    };
  } catch (error) {
    console.error(`❌ [AGENT:${agentName.toUpperCase()}] Error with agent:`, error.message);
    console.error(`   Error stack: ${error.stack}`);
    console.log('='.repeat(80) + '\n');

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
 * Uses OpenAI to determine which agent (healthcare, financial, legal, english, or general) is best suited
 */
async function routeToAgent(userPrompt) {
  console.log('\n' + '='.repeat(80));
  console.log('🔀 [ROUTER] Starting agent routing');
  console.log('='.repeat(80));
  console.log(`   User prompt: "${userPrompt}"`);

  const routingPrompt = `You are a routing assistant. Analyze the following user question and determine which specialized agent should handle it.

Available agents:
1. healthcare - For questions about health insurance, medical care, healthcare access, vaccinations, emergency care, preventive care, medical bills
2. financial - For questions about banking, credit, taxes, budgeting, financial planning, opening accounts
3. legal - For questions about immigration paperwork, visas, legal rights, document requirements, legal processes
4. english - For questions about learning English, understanding English conversations, explaining English text/documents/images, English phrases, grammar, pronunciation, translation help
5. general - For any other questions that don't fit the above categories (general knowledge, recipes, weather, sports, technology, etc.)

User question: "${userPrompt}"

Respond with ONLY one word: "healthcare", "financial", "legal", "english", or "general". Do not include any explanation or additional text.`;

  try {
    console.log('🤖 [ROUTER] Calling OpenAI for routing decision...');
    console.log('   Model: gpt-4o-mini');

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
    console.log(`📥 [ROUTER] Received routing response: "${routingResponse}"`);

    // Validate and normalize the response
    const validAgents = ['healthcare', 'financial', 'legal', 'english', 'general'];
    const selectedAgent = validAgents.includes(routingResponse)
      ? routingResponse
      : 'general'; // Default to general if unclear

    console.log(`✅ [ROUTER] Final agent selection: ${selectedAgent}`);
    console.log('='.repeat(80) + '\n');

    return selectedAgent;
  } catch (error) {
    console.error('❌ [ROUTER] Error routing to agent:', error.message);
    console.error(`   Error stack: ${error.stack}`);
    console.log('⚠️  [ROUTER] Defaulting to general agent');
    console.log('='.repeat(80) + '\n');
    // Default to general on error
    return 'general';
  }
}

export { runAgent, agents, routeToAgent };
