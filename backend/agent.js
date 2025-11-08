import { query } from '@anthropic-ai/claude-agent-sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Advanced example showing:
 * 1. Custom agents for different domains (healthcare, financial, legal)
 * 2. Custom system prompts
 * 3. Handling multiple queries
 * 4. Error handling
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
    model: 'sonnet',
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
    model: 'sonnet',
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
    model: 'sonnet',
  },
};

async function runAgent(agentName, userPrompt, options = {}) {
  const { silent = false } = options;
  
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
    // Set cwd to project root to access .claude/skills directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, '..');
    
    const agentQuery = query({
      prompt: userPrompt,
      options: {
        cwd: projectRoot,
        agents: {
          [agentName]: agent,
        },
        // Use the custom agent
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: agent.prompt,
        },
        model: agent.model,
        maxTurns: 5, // Limit conversation turns
      },
    });

    let lastAssistantMessage = null;
    let resultData = null;

    for await (const message of agentQuery) {
      switch (message.type) {
        case 'assistant':
          if (message.message.content) {
            for (const content of message.message.content) {
              if (content.type === 'text') {
                if (!silent) {
                  console.log(`💬 ${agentName} Advisor: ${content.text}\n`);
                }
                lastAssistantMessage = content.text;
              }
            }
          }
          break;

        case 'result':
          resultData = {
            success: message.subtype === 'success',
            duration_ms: message.duration_ms,
            cost_usd: message.total_cost_usd,
            usage: message.usage,
            errors: message.errors,
          };
          if (!silent) {
            if (message.subtype === 'success') {
              console.log(`✅ Completed (${message.duration_ms}ms, $${message.total_cost_usd.toFixed(4)})`);
            } else {
              console.log(`❌ Error: ${message.errors?.join(', ')}`);
            }
          }
          break;

        case 'tool_progress':
          if (!silent) {
            console.log(`⚙️  ${message.tool_name}...`);
          }
          break;
      }
    }

    return {
      response: lastAssistantMessage,
      agent: agentName,
      ...resultData,
    };
  } catch (error) {
    console.error(`❌ Error with ${agentName} agent:`, error.message);
    throw error;
  }
}

/**
 * Routes a user prompt to the most appropriate agent
 * Uses Claude to determine which agent (healthcare, financial, or legal) is best suited
 */
async function routeToAgent(userPrompt) {
  const routingPrompt = `You are a routing assistant. Analyze the following user question and determine which specialized agent should handle it.

Available agents:
1. healthcare - For questions about health insurance, medical care, healthcare access, vaccinations, emergency care, preventive care
2. financial - For questions about banking, credit, taxes, budgeting, financial planning, opening accounts
3. legal - For questions about immigration paperwork, visas, legal rights, document requirements, legal processes

User question: "${userPrompt}"

Respond with ONLY one word: "healthcare", "financial", or "legal". Do not include any explanation or additional text.`;

  try {
    // Set cwd to project root to access .claude/skills directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, '..');
    
    const routingQuery = query({
      prompt: routingPrompt,
      options: {
        cwd: projectRoot,
        model: 'sonnet',
        maxTurns: 1,
      },
    });

    let routingResponse = null;
    for await (const message of routingQuery) {
      if (message.type === 'assistant' && message.message.content) {
        for (const content of message.message.content) {
          if (content.type === 'text') {
            routingResponse = content.text.trim().toLowerCase();
          }
        }
      }
    }

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

