import axios from 'axios';
import type { Agent, Message } from '../../../shared/types';

const LMSTUDIO_BASE_URL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
const LMSTUDIO_MODEL = process.env.LMSTUDIO_MODEL || 'local-model';

/**
 * LM Studio Service for local, fast inference
 * Uses OpenAI-compatible API
 */
export class LMStudioService {
  /**
   * Generate agent response using local LM Studio model
   * This is much faster than Bedrock but uses a smaller model
   */
  static async generateAgentResponse(agent: Agent, allAgents: Agent[], conversationHistory: Message[], isAgentOnlyMode: boolean = false, userName?: string, userRole?: string): Promise<string> {
    try {
      // Format conversation history for the model
      const messages = this.formatMessagesForLMStudio(agent, allAgents, conversationHistory, isAgentOnlyMode, userName, userRole);

      // Call LM Studio OpenAI-compatible endpoint
      const response = await axios.post(
        `${LMSTUDIO_BASE_URL}/chat/completions`,
        {
          model: LMSTUDIO_MODEL,
          messages,
          max_tokens: 150,
          temperature: 0.8,
          top_p: 0.9,
          stream: false,
        },
        {
          timeout: 30000, // 30 second timeout
        }
      );

      let content = response.data.choices[0]?.message?.content || '';

      if (!content) {
        throw new Error('Empty response from LM Studio');
      }

      content = content.trim();

      // Strip any name prefix if the model accidentally included it
      // Pattern: "Name: text" or "Name - text"
      const namePrefix = new RegExp(`^${agent.name}\\s*[:-]\\s*`, 'i');
      content = content.replace(namePrefix, '');

      return content.trim();
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('LM Studio server not running at ' + LMSTUDIO_BASE_URL);
      }
      console.error('Error generating response from LM Studio:', error.message);
      throw new Error(`LM Studio inference failed: ${error.message}`);
    }
  }

  /**
   * Format conversation history for LM Studio (OpenAI format)
   */
  private static formatMessagesForLMStudio(agent: Agent, allAgents: Agent[], conversationHistory: Message[], isAgentOnlyMode: boolean = false, userName?: string, userRole?: string): any[] {
    // Extract topic from system message if present
    const systemMsg = conversationHistory.find(m => m.speaker === 'system');
    const topic = systemMsg ? systemMsg.text.replace('The conversation topic is: ', '') : '';

    // Determine if this is the first agent speaking
    const nonSystemMessages = conversationHistory.filter(m => m.speaker !== 'system');
    const isFirstAgent = nonSystemMessages.length === 0;

    // Get other agents in the conversation
    const otherAgents = allAgents.filter(a => a.id !== agent.id);

    // Build system message with agent persona
    let systemContent = `You are ${agent.name}, ${agent.role}.

${agent.persona}

YOU ARE IN A MULTI-PARTY CONVERSATION with the following participants:`;

    // List all participants
    if (otherAgents.length > 0) {
      systemContent += '\n' + otherAgents.map(a => `- ${a.name} (${a.role})`).join('\n');
    }

    // Add user with their name and role if provided
    if (userName && userRole) {
      systemContent += `\n- ${userName} (${userRole}, human participant)`;
    } else if (userName) {
      systemContent += `\n- ${userName} (human participant)`;
    } else {
      systemContent += '\n- User (human participant)';
    }

    if (isAgentOnlyMode) {
      if (isFirstAgent && topic) {
        systemContent += `

AGENT-ONLY CONVERSATION MODE:
You are having a discussion with other AI agents (no human present).

IMPORTANT - YOU MUST START THE CONVERSATION:
- The discussion topic is: "${topic}"
- As the first speaker, introduce this topic and share your thoughts on it
- Ask questions or make points that will engage the other agents
- Be specific and substantive about the topic
- This is YOUR responsibility to kick off the discussion`;
      } else {
        systemContent += `

AGENT-ONLY CONVERSATION MODE:
You are having a discussion with other AI agents (no human present) about: "${topic}"
- Respond to what the previous agent said
- Keep the discussion focused on the topic
- Build on points made by others
- Ask follow-up questions or present counter-points
- Have a natural, engaging discussion`;
      }
    }

    systemContent += `

Guidelines:
- You have a specific role and expertise, but you're a PERSON first, not a job title
- Only draw on your professional background when it's genuinely relevant to the topic
- If the topic isn't related to your expertise, just be yourself and engage naturally
- Don't force your role into every conversation - that's annoying and unnatural
- Respond naturally and conversationally as a real person would
- Keep responses concise (2-3 sentences max)
- Show personality through word choice and tone
- React to what others say, don't just state facts
- IMPORTANT: Address other participants by name when responding to them or bringing them into the discussion
- Call out specific agents when you want their input or disagree with them
- Make this feel like a natural group conversation where people reference each other
- Use brief actions in asterisks when appropriate (e.g., *nods*, *laughs*)
- IMPORTANT: Do NOT include your name in your responses - just speak directly`;

    const systemMessage = {
      role: 'system',
      content: systemContent,
    };

    // Get the last 6 messages for context (3 exchanges)
    const recentMessages = conversationHistory.slice(-6);

    // Convert to OpenAI format
    const formattedMessages = recentMessages.map((msg) => {
      if (msg.speaker === 'user') {
        return {
          role: 'user' as const,
          content: `User: ${msg.text}`,
        };
      } else if (msg.speaker === 'system') {
        // Skip system messages - already in system prompt
        return null;
      } else {
        // Find which agent spoke
        const speaker = allAgents.find(a => a.id === msg.speaker);
        const speakerName = speaker ? speaker.name : 'Unknown';

        // If this agent spoke, use assistant role. Otherwise, show as user input
        if (msg.speaker === agent.id) {
          return {
            role: 'assistant' as const,
            content: msg.text,
          };
        } else {
          return {
            role: 'user' as const,
            content: `${speakerName}: ${msg.text}`,
          };
        }
      }
    }).filter(m => m !== null);

    return [systemMessage, ...formattedMessages];
  }

  /**
   * Test connection to LM Studio server
   */
  static async testConnection(): Promise<{ available: boolean; model?: string; error?: string }> {
    try {
      const response = await axios.get(`${LMSTUDIO_BASE_URL}/models`, {
        timeout: 5000,
      });

      const models = response.data.data || [];
      if (models.length === 0) {
        return {
          available: false,
          error: 'No models loaded in LM Studio',
        };
      }

      return {
        available: true,
        model: models[0].id,
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return {
          available: false,
          error: 'LM Studio server not running',
        };
      }
      return {
        available: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if LM Studio is configured and available
   */
  static isConfigured(): boolean {
    return !!LMSTUDIO_BASE_URL;
  }
}
