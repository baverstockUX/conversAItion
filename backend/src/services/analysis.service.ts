import { ClaudeService } from './claude.service';
import { Agent, Message, ConversationAnalysis } from '../../../shared/types';
import { ConversationModel } from '../models/conversation.model';

export class AnalysisService {
  /**
   * Generate comprehensive analysis for a completed conversation
   */
  static async analyzeConversation(
    conversationId: string
  ): Promise<ConversationAnalysis> {
    const conversation = ConversationModel.findById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.status !== 'completed') {
      throw new Error('Cannot analyze incomplete conversation');
    }

    if (conversation.messages.length === 0) {
      throw new Error('No messages to analyze');
    }

    // Get agents
    const { AgentModel } = await import('../models/agent.model');
    const agents = AgentModel.findByIds(conversation.agentIds);

    // Generate analysis using Claude
    const analysisResult = await ClaudeService.generateAnalysis(
      conversation.topic,
      conversation.messages,
      agents
    );

    // Save analysis to database
    const analysis = ConversationModel.saveAnalysis({
      conversationId,
      summary: analysisResult.summary,
      strengths: analysisResult.strengths,
      improvements: analysisResult.improvements,
      keyMoments: analysisResult.keyMoments,
      feedback: analysisResult.feedback,
    });

    return analysis;
  }

  /**
   * Get existing analysis or generate new one
   */
  static async getOrCreateAnalysis(
    conversationId: string
  ): Promise<ConversationAnalysis> {
    // Check if analysis already exists
    const existing = ConversationModel.getAnalysis(conversationId);

    if (existing) {
      return existing;
    }

    // Generate new analysis
    return await this.analyzeConversation(conversationId);
  }
}
