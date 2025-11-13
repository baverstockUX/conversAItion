import { Router, Request, Response } from 'express';
import { ConversationModel } from '../models/conversation.model';
import { AnalysisService } from '../services/analysis.service';

const router = Router();

// GET /api/conversations - List all conversations
router.get('/', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const conversations = ConversationModel.findAll(limit, offset);
    res.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/:id - Get conversation by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const conversation = ConversationModel.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// POST /api/conversations - Create new conversation
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, topic, agentIds } = req.body;

    // Validation
    if (!title || !topic || !agentIds || !Array.isArray(agentIds)) {
      return res.status(400).json({
        error: 'Missing required fields: title, topic, agentIds (array)',
      });
    }

    if (agentIds.length === 0 || agentIds.length > 3) {
      return res.status(400).json({
        error: 'Must have 1-3 agents',
      });
    }

    const conversation = ConversationModel.create({
      title: title.trim(),
      topic: topic.trim(),
      agentIds,
    });

    res.status(201).json(conversation);
  } catch (error: any) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// POST /api/conversations/:id/complete - Mark conversation as complete
router.post('/:id/complete', (req: Request, res: Response) => {
  try {
    const success = ConversationModel.complete(req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation marked as completed' });
  } catch (error: any) {
    console.error('Error completing conversation:', error);
    res.status(500).json({ error: 'Failed to complete conversation' });
  }
});

// GET /api/conversations/:id/analysis - Get or generate conversation analysis
router.get('/:id/analysis', async (req: Request, res: Response) => {
  try {
    const analysis = await AnalysisService.getOrCreateAnalysis(req.params.id);
    res.json(analysis);
  } catch (error: any) {
    console.error('Error generating analysis:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('incomplete')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to generate analysis' });
  }
});

// DELETE /api/conversations/:id - Delete conversation
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const success = ConversationModel.delete(req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
