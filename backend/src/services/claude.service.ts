import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Agent, Message } from '../../../shared/types';

// Configure Bedrock client
// If AWS_PROFILE is set, it will use credentials from that profile automatically
// Otherwise, it will use explicit credentials from environment variables
const clientConfig: any = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// Only set explicit credentials if not using AWS_PROFILE
if (!process.env.AWS_PROFILE && process.env.AWS_ACCESS_KEY_ID) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN,
  };
}

const client = new BedrockRuntimeClient(clientConfig);

const SONNET_MODEL = process.env.CLAUDE_MODEL_SONNET || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const HAIKU_MODEL = process.env.CLAUDE_MODEL_HAIKU || 'anthropic.claude-3-5-haiku-20241022-v1:0';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ClaudeService {
  /**
   * Generate a response from an agent given the conversation history
   */
  static async generateAgentResponse(
    agent: Agent,
    allAgents: Agent[],
    conversationHistory: Message[],
    isAgentOnlyMode: boolean = false
  ): Promise<string> {
    const messages = this.formatMessagesForClaude(conversationHistory, agent.id, allAgents);

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 150, // Keep responses concise for conversation flow
      temperature: 0.8, // Slightly creative for personality
      system: this.buildSystemPrompt(agent, allAgents, conversationHistory, isAgentOnlyMode),
      messages,
    };

    try {
      const command = new InvokeModelCommand({
        modelId: SONNET_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const text = responseBody.content[0].text;
      return text.trim();
    } catch (error) {
      console.error(`Error generating response for agent ${agent.name}:`, error);
      throw error;
    }
  }

  /**
   * Score an agent's response based on relevance, consistency, and engagement
   */
  static async scoreResponse(
    agent: Agent,
    response: string,
    conversationHistory: Message[]
  ): Promise<number> {
    const lastMessages = conversationHistory.slice(-3);
    const context = lastMessages
      .map(m => `${m.speaker === 'user' ? 'User' : 'Agent'}: ${m.text}`)
      .join('\n');

    const scoringPrompt = `
Score this agent response from 0-10 based on the criteria below.

Conversation context (last 3 messages):
${context}

Agent: ${agent.name} (${agent.role})
Proposed response: ${response}

Scoring criteria:
- Relevance to conversation (0-4 points): Does it advance the conversation meaningfully?
- Character consistency for ${agent.name} (0-3 points): Does it match their role and persona?
- Engagement/entertainment value (0-3 points): Is it interesting and adds value?

Return ONLY a single number from 0-10. No explanation.
`;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 10,
      temperature: 0.3, // Lower temperature for consistent scoring
      messages: [
        {
          role: 'user',
          content: scoringPrompt,
        },
      ],
    };

    try {
      const command = new InvokeModelCommand({
        modelId: HAIKU_MODEL, // Use cheaper model for scoring
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const scoreText = responseBody.content[0].text.trim();
      const score = parseFloat(scoreText);

      return isNaN(score) ? 5 : Math.max(0, Math.min(10, score)); // Clamp between 0-10
    } catch (error) {
      console.error(`Error scoring response for agent ${agent.name}:`, error);
      return 5; // Default mid-range score on error
    }
  }

  /**
   * Generate post-conversation analysis and feedback
   */
  static async generateAnalysis(
    topic: string,
    messages: Message[],
    agents: Agent[]
  ): Promise<{
    summary: string;
    strengths: string[];
    improvements: string[];
    keyMoments: string[];
    feedback: string;
  }> {
    const transcript = messages
      .map(m => {
        const speaker = m.speaker === 'user' ? 'User' : agents.find(a => a.id === m.speaker)?.name || 'Agent';
        return `${speaker}: ${m.text}`;
      })
      .join('\n');

    const analysisPrompt = `
You are an expert conversation analyst. Analyze this conversation and provide detailed feedback.

Topic: ${topic}

Conversation Transcript:
${transcript}

Provide analysis in the following JSON format:
{
  "summary": "A 2-3 sentence summary of the conversation",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "keyMoments": ["moment1", "moment2", "moment3"],
  "feedback": "Detailed 3-4 paragraph feedback focusing on user performance, communication effectiveness, and specific recommendations"
}

Focus on:
- How well the user engaged with the topic
- Communication clarity and effectiveness
- Areas where the user excelled
- Specific, actionable improvements
- Notable exchanges or turning points

Return ONLY valid JSON, no additional text.
`;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2000,
      temperature: 0.5,
      messages: [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    };

    try {
      const command = new InvokeModelCommand({
        modelId: SONNET_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const analysisText = responseBody.content[0].text.trim();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/) || analysisText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : analysisText;

      const analysis = JSON.parse(jsonStr);

      return {
        summary: analysis.summary || 'No summary available',
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
        improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
        keyMoments: Array.isArray(analysis.keyMoments) ? analysis.keyMoments : [],
        feedback: analysis.feedback || 'No detailed feedback available',
      };
    } catch (error) {
      console.error('Error generating conversation analysis:', error);

      // Return fallback analysis
      return {
        summary: 'Analysis could not be generated at this time.',
        strengths: ['Participated in the conversation'],
        improvements: ['Analysis unavailable - please try again'],
        keyMoments: [],
        feedback: 'An error occurred while generating detailed feedback. Please try analyzing the conversation again.',
      };
    }
  }

  /**
   * Build system prompt for agent
   */
  private static buildSystemPrompt(agent: Agent, allAgents: Agent[], conversationHistory: Message[], isAgentOnlyMode: boolean = false): string {
    // Extract topic from system message if present
    const systemMsg = conversationHistory.find(m => m.speaker === 'system');
    const topic = systemMsg ? systemMsg.text.replace('The conversation topic is: ', '') : '';

    // Determine if this is the first agent speaking
    const nonSystemMessages = conversationHistory.filter(m => m.speaker !== 'system');
    const isFirstAgent = nonSystemMessages.length === 0;

    // Get other agents in the conversation
    const otherAgents = allAgents.filter(a => a.id !== agent.id);

    let prompt = `You are ${agent.name}, ${agent.role}.

${agent.persona}

YOU ARE IN A MULTI-PARTY CONVERSATION with the following participants:`;

    // List all participants
    if (otherAgents.length > 0) {
      prompt += '\n' + otherAgents.map(a => `- ${a.name} (${a.role})`).join('\n');
    }
    prompt += '\n- User (human participant)';

    if (isAgentOnlyMode) {
      if (isFirstAgent && topic) {
        prompt += `

AGENT-ONLY CONVERSATION MODE:
You are having a discussion with other AI agents (no human present).

IMPORTANT - YOU MUST START THE CONVERSATION:
- The discussion topic is: "${topic}"
- As the first speaker, introduce this topic and share your thoughts on it
- Ask questions or make points that will engage the other agents
- Be specific and substantive about the topic
- This is YOUR responsibility to kick off the discussion`;
      } else {
        prompt += `

AGENT-ONLY CONVERSATION MODE:
You are having a discussion with other AI agents (no human present) about: "${topic}"
- Respond to what the previous agent said
- Keep the discussion focused on the topic
- Build on points made by others
- Ask follow-up questions or present counter-points
- Have a natural, engaging discussion`;
      }
    }

    prompt += `

Guidelines:
- Stay strictly in character at all times
- Respond naturally and conversationally
- Keep responses concise (2-4 sentences typically)
- React to what others say, don't ignore previous messages
- IMPORTANT: Address other participants by name when responding to them or bringing them into the discussion
- Call out specific agents when you want their input or disagree with them
- Make this feel like a natural group conversation where people reference each other
- Be engaging and add value to the conversation
- Never break character or mention that you are an AI

Remember: You are in a multi-party conversation. Listen to what others say and respond appropriately.`;

    return prompt;
  }

  /**
   * Format conversation history for Claude API
   */
  private static formatMessagesForClaude(
    history: Message[],
    currentAgentId: string,
    allAgents: Agent[]
  ): ClaudeMessage[] {
    const messages: ClaudeMessage[] = [];

    for (const msg of history) {
      if (msg.speaker === 'system') {
        // Skip system messages - already in system prompt
        continue;
      } else if (msg.speaker === 'user') {
        messages.push({
          role: 'user',
          content: `User said: ${msg.text}`,
        });
      } else if (msg.speaker === currentAgentId) {
        messages.push({
          role: 'assistant',
          content: msg.text,
        });
      } else {
        // Another agent spoke - find their name and present as user message
        const speaker = allAgents.find(a => a.id === msg.speaker);
        const speakerName = speaker ? speaker.name : 'Unknown participant';
        messages.push({
          role: 'user',
          content: `${speakerName} said: ${msg.text}`,
        });
      }
    }

    // If the last message was from an assistant, we need to add a user message
    // to prompt the next response
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      messages.push({
        role: 'user',
        content: 'Please respond to the conversation.',
      });
    }

    // If no messages yet or last is user, we're good
    if (messages.length === 0) {
      messages.push({
        role: 'user',
        content: 'Please introduce yourself briefly and engage with the conversation topic.',
      });
    }

    return messages;
  }
}
