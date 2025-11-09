import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendWhatsAppMessage } from './whatsapp.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env') });

/**
 * Example: Send a proactive WhatsApp message
 *
 * This demonstrates how to send messages programmatically,
 * useful for:
 * - Appointment reminders
 * - Follow-up messages
 * - Notifications
 * - Scheduled health tips
 */

async function sendProactiveMessage() {
  // Replace with the user's phone number (in E.164 format)
  const recipientPhone = '+1234567890'; // Example: +15551234567

  const message = `Hello! This is a reminder from your Guru healthcare assistant.

Don't forget to schedule your annual checkup. Reply to this message if you need help finding affordable healthcare options.`;

  try {
    console.log(`Sending message to ${recipientPhone}...`);
    const result = await sendWhatsAppMessage(recipientPhone, message);
    console.log('✅ Message sent successfully!');
    console.log(`Message SID: ${result.sid}`);
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
  }
}

/**
 * Example: Send a message with media (image, PDF, etc.)
 */
async function sendMessageWithMedia() {
  const recipientPhone = '+1234567890';
  const message = 'Here is a helpful guide about healthcare insurance options:';
  const mediaUrl = 'https://example.com/healthcare-guide.pdf';

  try {
    console.log(`Sending message with media to ${recipientPhone}...`);
    const result = await sendWhatsAppMessage(recipientPhone, message, mediaUrl);
    console.log('✅ Message with media sent successfully!');
    console.log(`Message SID: ${result.sid}`);
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
  }
}

/**
 * Example: Scheduled health tips campaign
 */
async function sendHealthTip(phoneNumber, tip) {
  const message = `💡 Daily Health Tip:\n\n${tip}\n\nReply with any health-related questions!`;

  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log(`✅ Health tip sent to ${phoneNumber}`);
  } catch (error) {
    console.error(`❌ Failed to send health tip: ${error.message}`);
  }
}

// Example usage
if (process.argv[2] === 'send') {
  // Example: node whatsapp-example.js send
  console.log('\n📱 WhatsApp Message Examples\n');
  console.log('This is just an example. Update the phone number before running!\n');

  // Uncomment to actually send:
  // await sendProactiveMessage();

  console.log('To actually send messages, edit this file and uncomment the function calls.');
} else {
  console.log('\nWhatsApp Messaging Examples\n');
  console.log('Usage:');
  console.log('  node whatsapp-example.js send\n');
  console.log('Available functions:');
  console.log('  - sendProactiveMessage()     Send a reminder or notification');
  console.log('  - sendMessageWithMedia()     Send a message with an attachment');
  console.log('  - sendHealthTip()            Send a daily health tip\n');
  console.log('Edit this file to customize the messages and recipients.\n');
}
