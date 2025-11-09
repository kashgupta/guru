import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env') });

/**
 * Test script to verify WhatsApp integration setup
 */

console.log('\n🔍 Testing WhatsApp Integration Setup\n');
console.log('='.repeat(60));

// Check required environment variables
const requiredVars = [
  'OPENAI_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
];

let allConfigured = true;

console.log('\n📋 Environment Variables Check:\n');

for (const varName of requiredVars) {
  const value = process.env[varName];
  const isConfigured = value && !value.includes('your_') && !value.includes('_here');

  if (isConfigured) {
    console.log(`  ✅ ${varName}: Configured`);
  } else {
    console.log(`  ❌ ${varName}: Not configured or contains placeholder`);
    allConfigured = false;
  }
}

console.log('\n' + '='.repeat(60));

if (!allConfigured) {
  console.log('\n❌ Setup incomplete!\n');
  console.log('Please update your .env file with the correct values.\n');
  console.log('See WHATSAPP_QUICKSTART.md for setup instructions.\n');
  process.exit(1);
}

// Test Twilio connection
console.log('\n🔌 Testing Twilio Connection...\n');

try {
  const twilio = await import('twilio');
  const client = twilio.default(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  // Try to fetch account info
  const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

  console.log(`  ✅ Connected to Twilio`);
  console.log(`  Account: ${account.friendlyName}`);
  console.log(`  Status: ${account.status}`);
  console.log(`  Type: ${account.type}`);

} catch (error) {
  console.log(`  ❌ Failed to connect to Twilio`);
  console.log(`  Error: ${error.message}`);
  console.log('\n  Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN\n');
  process.exit(1);
}

// Test OpenAI connection
console.log('\n🤖 Testing OpenAI Connection...\n');

try {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Test with a simple request
  const models = await openai.models.list();

  console.log(`  ✅ Connected to OpenAI`);
  console.log(`  Available models: ${models.data.length}`);

} catch (error) {
  console.log(`  ❌ Failed to connect to OpenAI`);
  console.log(`  Error: ${error.message}`);
  console.log('\n  Please check your OPENAI_API_KEY\n');
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ All checks passed! Your WhatsApp integration is configured correctly.\n');

console.log('Next steps:\n');
console.log('1. Start your backend server:');
console.log('   cd backend && npm start\n');
console.log('2. Expose it with ngrok:');
console.log('   ngrok http 3001\n');
console.log('3. Configure Twilio webhook with your ngrok URL');
console.log('4. Send a WhatsApp message to test!\n');

console.log('See WHATSAPP_QUICKSTART.md for detailed instructions.\n');
