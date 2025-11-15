import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for storing user conversation state
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not found. Conversation persistence will be disabled.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Get conversation ID for a phone number
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<{conversationId: string|null, lastAgent: string|null}>}
 */
async function getConversation(phoneNumber) {
  if (!supabase) {
    console.warn('⚠️ Supabase not initialized');
    return { conversationId: null, lastAgent: null };
  }

  try {
    console.log(`📥 [SUPABASE] Getting conversation for ${phoneNumber}`);

    const { data, error } = await supabase
      .from('user_conversations')
      .select('conversation_id, last_agent')
      .eq('phone_number', phoneNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user doesn't have a conversation yet
        console.log(`   No existing conversation found`);
        return { conversationId: null, lastAgent: null };
      }
      throw error;
    }

    console.log(`✅ [SUPABASE] Found conversation: ${data.conversation_id}`);
    return {
      conversationId: data.conversation_id,
      lastAgent: data.last_agent,
    };
  } catch (error) {
    console.error('❌ [SUPABASE] Error getting conversation:', error.message);
    return { conversationId: null, lastAgent: null };
  }
}

/**
 * Save or update conversation ID for a phone number
 * @param {string} phoneNumber - User's phone number
 * @param {string} conversationId - OpenAI conversation ID
 * @param {string} agentName - Agent name used
 */
async function saveConversation(phoneNumber, conversationId, agentName) {
  if (!supabase) {
    console.warn('⚠️ Supabase not initialized');
    return;
  }

  try {
    console.log(`💾 [SUPABASE] Saving conversation for ${phoneNumber}`);
    console.log(`   Conversation ID: ${conversationId}`);
    console.log(`   Agent: ${agentName}`);

    const { error } = await supabase
      .from('user_conversations')
      .upsert(
        {
          phone_number: phoneNumber,
          conversation_id: conversationId,
          last_agent: agentName,
          last_activity: new Date().toISOString(),
        },
        {
          onConflict: 'phone_number',
        }
      );

    if (error) throw error;

    console.log(`✅ [SUPABASE] Conversation saved successfully`);
  } catch (error) {
    console.error('❌ [SUPABASE] Error saving conversation:', error.message);
  }
}

/**
 * Delete conversation for a phone number (optional, for testing/cleanup)
 * @param {string} phoneNumber - User's phone number
 */
async function deleteConversation(phoneNumber) {
  if (!supabase) {
    console.warn('⚠️ Supabase not initialized');
    return;
  }

  try {
    console.log(`🗑️ [SUPABASE] Deleting conversation for ${phoneNumber}`);

    const { error } = await supabase
      .from('user_conversations')
      .delete()
      .eq('phone_number', phoneNumber);

    if (error) throw error;

    console.log(`✅ [SUPABASE] Conversation deleted successfully`);
  } catch (error) {
    console.error('❌ [SUPABASE] Error deleting conversation:', error.message);
  }
}

/**
 * Clean up old conversations (inactive for more than 30 days)
 * Run this periodically to clean up stale data
 */
async function cleanupOldConversations() {
  if (!supabase) {
    console.warn('⚠️ Supabase not initialized');
    return;
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`🧹 [SUPABASE] Cleaning up conversations older than ${thirtyDaysAgo.toISOString()}`);

    const { data, error } = await supabase
      .from('user_conversations')
      .delete()
      .lt('last_activity', thirtyDaysAgo.toISOString())
      .select();

    if (error) throw error;

    console.log(`✅ [SUPABASE] Cleaned up ${data?.length || 0} old conversations`);
  } catch (error) {
    console.error('❌ [SUPABASE] Error cleaning up conversations:', error.message);
  }
}

export {
  supabase,
  getConversation,
  saveConversation,
  deleteConversation,
  cleanupOldConversations,
};
