import { runAgent, routeToAgent } from './agent.js';

/**
 * Test script for OpenAI Agents SDK integration
 * Tests both routing and agent execution
 */

async function testAgents() {
  console.log('🧪 Testing OpenAI Agents SDK Integration\n');

  // Test 1: Healthcare query
  console.log('TEST 1: Healthcare Query');
  console.log('=' .repeat(60));
  try {
    const healthcarePrompt = 'How do I find affordable health insurance?';
    const agent1 = await routeToAgent(healthcarePrompt);
    console.log(`✅ Routed to: ${agent1}`);

    const result1 = await runAgent(agent1, healthcarePrompt, { silent: false });
    console.log('\n✅ Healthcare test completed');
    console.log(`Cost: $${result1.cost_usd.toFixed(4)}`);
    console.log(`Duration: ${result1.duration_ms}ms\n`);
  } catch (error) {
    console.error('❌ Healthcare test failed:', error.message);
  }

  // Test 2: Financial query
  console.log('\nTEST 2: Financial Query');
  console.log('='.repeat(60));
  try {
    const financialPrompt = 'How do I open a bank account as an immigrant?';
    const agent2 = await routeToAgent(financialPrompt);
    console.log(`✅ Routed to: ${agent2}`);

    const result2 = await runAgent(agent2, financialPrompt, { silent: false });
    console.log('\n✅ Financial test completed');
    console.log(`Cost: $${result2.cost_usd.toFixed(4)}`);
    console.log(`Duration: ${result2.duration_ms}ms\n`);
  } catch (error) {
    console.error('❌ Financial test failed:', error.message);
  }

  // Test 3: Legal query
  console.log('\nTEST 3: Legal Query');
  console.log('='.repeat(60));
  try {
    const legalPrompt = 'What documents do I need for a green card application?';
    const agent3 = await routeToAgent(legalPrompt);
    console.log(`✅ Routed to: ${agent3}`);

    const result3 = await runAgent(agent3, legalPrompt, { silent: false });
    console.log('\n✅ Legal test completed');
    console.log(`Cost: $${result3.cost_usd.toFixed(4)}`);
    console.log(`Duration: ${result3.duration_ms}ms\n`);
  } catch (error) {
    console.error('❌ Legal test failed:', error.message);
  }

  // Test 4: Conversation history
  console.log('\nTEST 4: Conversation History');
  console.log('='.repeat(60));
  try {
    const conversationHistory = [
      { role: 'user', content: 'I need help with medical bills' },
      { role: 'assistant', content: 'I can help you understand your medical bills and explore options for financial assistance. What specific questions do you have?' }
    ];

    const followUpPrompt = 'What if I cannot afford to pay?';
    const agent4 = await routeToAgent(followUpPrompt);
    console.log(`✅ Routed to: ${agent4}`);

    const result4 = await runAgent(agent4, followUpPrompt, {
      silent: false,
      conversationHistory
    });
    console.log('\n✅ Conversation history test completed');
    console.log(`Cost: $${result4.cost_usd.toFixed(4)}`);
    console.log(`Duration: ${result4.duration_ms}ms\n`);
  } catch (error) {
    console.error('❌ Conversation history test failed:', error.message);
  }

  console.log('\n🎉 All tests completed!');
}

// Run tests
testAgents().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
