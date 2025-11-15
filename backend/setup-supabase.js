#!/usr/bin/env node

/**
 * Supabase Setup and Testing Script
 *
 * This script helps you:
 * 1. Test Supabase connection
 * 2. Create the user_conversations table
 * 3. Test basic operations
 */

import { supabase } from './supabase.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n' + '='.repeat(80));
console.log('🚀 Supabase Setup Script');
console.log('='.repeat(80) + '\n');

async function testConnection() {
  console.log('1️⃣  Testing Supabase connection...');

  if (!supabase) {
    console.error('❌ Supabase client not initialized. Check your .env file.');
    console.error('   Required: SUPABASE_URL and SUPABASE_ANON_KEY');
    process.exit(1);
  }

  try {
    // Test connection by querying the database
    const { data, error } = await supabase
      .from('user_conversations')
      .select('count')
      .limit(1);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('⚠️  Table does not exist yet. This is expected on first run.');
        return false; // Table doesn't exist
      }
      throw error;
    }

    console.log('✅ Connected to Supabase successfully!');
    console.log(`   Found existing user_conversations table`);
    return true; // Table exists
  } catch (error) {
    console.error('❌ Error connecting to Supabase:', error.message);
    process.exit(1);
  }
}

async function createTable() {
  console.log('\n2️⃣  Creating user_conversations table...');

  try {
    // Read the schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('📄 Schema file loaded');
    console.log('⚠️  Note: The Supabase JS client cannot execute raw SQL directly.');
    console.log('   Please run the SQL manually using one of these methods:\n');

    console.log('   Option A: Supabase Dashboard');
    console.log('   1. Go to: https://app.supabase.com/project/_/editor');
    console.log('   2. Open the SQL Editor');
    console.log('   3. Copy the contents of backend/schema.sql');
    console.log('   4. Paste and click "Run"\n');

    console.log('   Option B: Copy the SQL below and paste it into Supabase SQL Editor:');
    console.log('   ' + '-'.repeat(76));
    console.log(schema);
    console.log('   ' + '-'.repeat(76) + '\n');

  } catch (error) {
    console.error('❌ Error reading schema file:', error.message);
    process.exit(1);
  }
}

async function testOperations() {
  console.log('\n3️⃣  Testing basic operations...');

  const testPhone = '+1234567890';
  const testConversationId = 'conv_test_' + Date.now();

  try {
    // Test insert
    console.log('   Testing insert...');
    const { error: insertError } = await supabase
      .from('user_conversations')
      .insert({
        phone_number: testPhone,
        conversation_id: testConversationId,
        last_agent: 'healthcare',
      });

    if (insertError) throw insertError;
    console.log('   ✅ Insert successful');

    // Test select
    console.log('   Testing select...');
    const { data: selectData, error: selectError } = await supabase
      .from('user_conversations')
      .select('*')
      .eq('phone_number', testPhone)
      .single();

    if (selectError) throw selectError;
    console.log('   ✅ Select successful:', selectData);

    // Test update
    console.log('   Testing update...');
    const { error: updateError } = await supabase
      .from('user_conversations')
      .update({ last_agent: 'financial' })
      .eq('phone_number', testPhone);

    if (updateError) throw updateError;
    console.log('   ✅ Update successful');

    // Test delete (cleanup)
    console.log('   Testing delete...');
    const { error: deleteError } = await supabase
      .from('user_conversations')
      .delete()
      .eq('phone_number', testPhone);

    if (deleteError) throw deleteError;
    console.log('   ✅ Delete successful');

    console.log('\n✅ All operations completed successfully!');

  } catch (error) {
    console.error('❌ Error during operations:', error.message);

    // Cleanup on error
    try {
      await supabase
        .from('user_conversations')
        .delete()
        .eq('phone_number', testPhone);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

async function main() {
  try {
    const tableExists = await testConnection();

    if (!tableExists) {
      await createTable();
      console.log('\n⏸️  Pausing... Please create the table using the SQL above.');
      console.log('   After creating the table, run this script again to test operations.');
      process.exit(0);
    }

    await testOperations();

    console.log('\n' + '='.repeat(80));
    console.log('🎉 Setup complete! Your Supabase integration is ready.');
    console.log('='.repeat(80) + '\n');

    console.log('Next steps:');
    console.log('1. Start your backend: npm start');
    console.log('2. Test with WhatsApp messages');
    console.log('3. Check logs for conversation state operations\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
