/**
 * Shared Voice Agent Configuration
 *
 * This module provides shared configuration and utilities for OpenAI Realtime API
 * Used by both:
 * - Web app voice agent (via /api/voice-agent/session)
 * - WhatsApp voice calls (via Media Streams)
 */

// Agent prompts - matching agent.js exactly
const AGENT_PROMPTS = {
  healthcare: `You are a compassionate healthcare advisor helping immigrants understand:
- How to find affordable healthcare options
- Understanding health insurance in the US
- Finding community health centers
- Emergency healthcare procedures
- Preventive care and vaccinations
- Medical bill negotiation and financial assistance
Always provide clear, actionable advice in simple language.`,
  financial: `You are a financial advisor specializing in helping immigrants:
- Open bank accounts
- Build credit history
- Understand taxes
- Save money and budget
- Access financial resources
Provide practical, step-by-step guidance.`,
  legal: `You are a legal advisor helping immigrants with:
- Immigration paperwork and processes
- Understanding legal rights
- Finding legal resources
- Document requirements
- Important deadlines
Always clarify that you provide general information, not legal advice, and recommend consulting an attorney for specific cases.`,
};

/**
 * Get base instructions for voice agent
 * @param {string} agentType - The agent type (healthcare, financial, legal)
 * @param {string} context - Additional context (e.g., 'whatsapp', 'webapp')
 * @returns {string} The instructions
 */
function getVoiceInstructions(agentType = 'healthcare', context = 'voice') {
  const basePrompt = AGENT_PROMPTS[agentType] || AGENT_PROMPTS.healthcare;

  if (context === 'whatsapp') {
    return `${basePrompt}

GREETING INSTRUCTIONS:
When you first connect, you MUST:
1. Acknowledge the user is switching from text to voice chat via WhatsApp
2. Reference specific details from what you already discussed
3. Ask how you can continue helping them

Remember: You have access to the full conversation history, so reference specific topics, concerns, or advice you previously provided.`;
  }

  // Default webapp context
  return `${basePrompt}

GREETING INSTRUCTIONS:
When you first connect, you MUST:
1. Acknowledge the user is switching from text to voice chat
2. Reference specific details from what you already discussed
3. Ask how you can continue helping them

Remember: You have access to the full conversation history, so reference specific topics, concerns, or advice you previously provided.`;
}

/**
 * Format conversation history for voice agent context
 * @param {Array} conversationHistory - Array of {role, content} messages
 * @returns {string} Formatted context message
 */
function formatConversationContext(conversationHistory, platform = 'voice') {
  if (!conversationHistory || conversationHistory.length === 0) {
    return null;
  }

  const conversationText = conversationHistory
    .map((msg) => {
      const speaker = msg.role === 'user' ? 'User' : 'Assistant';
      return `${speaker}: ${msg.content}`;
    })
    .join('\n\n');

  const platformText = platform === 'whatsapp' ? 'via WhatsApp' : '';

  return `PREVIOUS CONVERSATION CONTEXT:

The user just had a text conversation with you ${platformText}. Here's the complete conversation history:

${conversationText}

---
You are now switching to voice mode. Reference specific details from this conversation when greeting the user.`;
}

/**
 * Get OpenAI Realtime API session configuration
 * Shared config used by both webapp and WhatsApp
 */
const REALTIME_CONFIG = {
  model: 'gpt-4o-realtime-preview-2024-12-17',
  voice: 'verse',
  input_audio_transcription: {
    model: 'whisper-1'
  },
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500
  }
};

/**
 * Create conversation.item.create payload for injecting context
 * @param {string} contextMessage - The formatted context message
 * @returns {Object} The payload to send to OpenAI Realtime API
 */
function createContextInjectionPayload(contextMessage) {
  return {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'system', // Use 'system' role per OpenAI best practices
      content: [
        {
          type: 'input_text',
          text: contextMessage,
        },
      ],
    },
  };
}

/**
 * Create response.create payload to trigger initial greeting
 * @returns {Object} The payload to send to OpenAI Realtime API
 */
function createInitialResponsePayload() {
  return {
    type: 'response.create',
    response: {
      modalities: ['text', 'audio'],
    },
  };
}

export {
  AGENT_PROMPTS,
  REALTIME_CONFIG,
  getVoiceInstructions,
  formatConversationContext,
  createContextInjectionPayload,
  createInitialResponsePayload,
};
