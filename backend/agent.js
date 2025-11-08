import { query } from '@anthropic-ai/claude-agent-sdk';

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
    description: 'A healthcare advisor specializing in helping immigrants navigate the US healthcare system',
    prompt: `You are a compassionate healthcare advisor helping immigrants understand:
- How to find affordable healthcare options
- Understanding health insurance in the US
- Finding community health centers
- Emergency healthcare procedures
- Preventive care and vaccinations
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

async function runAgent(agentName, userPrompt) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 ${agentName.toUpperCase()} AGENT`);
  console.log('='.repeat(60));
  console.log(`User: ${userPrompt}\n`);

  const agent = agents[agentName];
  if (!agent) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  try {
    const agentQuery = query({
      prompt: userPrompt,
      options: {
        cwd: process.cwd(),
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

    for await (const message of agentQuery) {
      switch (message.type) {
        case 'assistant':
          if (message.message.content) {
            for (const content of message.message.content) {
              if (content.type === 'text') {
                console.log(`💬 ${agentName} Advisor: ${content.text}\n`);
                lastAssistantMessage = content.text;
              }
            }
          }
          break;

        case 'result':
          if (message.subtype === 'success') {
            console.log(`✅ Completed (${message.duration_ms}ms, $${message.total_cost_usd.toFixed(4)})`);
          } else {
            console.log(`❌ Error: ${message.errors?.join(', ')}`);
          }
          break;

        case 'tool_progress':
          console.log(`⚙️  ${message.tool_name}...`);
          break;
      }
    }

    return lastAssistantMessage;
  } catch (error) {
    console.error(`❌ Error with ${agentName} agent:`, error.message);
    throw error;
  }
}

async function advancedExample() {
  console.log('🚀 Advanced Claude Agent SDK Example\n');
  console.log('This example demonstrates custom agents for different domains.\n');

  // Example 1: Healthcare question
  await runAgent(
    'healthcare',
    'I just moved to the US and need health insurance. What are my options?'
  );

  // Example 2: Financial question
  await runAgent(
    'financial',
    'How do I build credit as a new immigrant with no credit history?'
  );

  // Example 3: Legal question
  await runAgent(
    'legal',
    'What documents do I need to renew my work visa?'
  );

  console.log('\n' + '='.repeat(60));
  console.log('✨ All examples completed!');
  console.log('='.repeat(60));
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  advancedExample().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runAgent, agents };

