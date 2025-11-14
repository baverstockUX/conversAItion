import { Router, Request, Response } from 'express';
import { ScenarioModel } from '../models/scenario.model';

const router = Router();

// GET /api/scenarios - List all scenarios with agents
router.get('/', (req: Request, res: Response) => {
  try {
    const scenarios = ScenarioModel.findAllWithAgents();
    res.json(scenarios);
  } catch (error: any) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// GET /api/scenarios/category/:category - Get scenarios by category
router.get('/category/:category', (req: Request, res: Response) => {
  try {
    const scenarios = ScenarioModel.findByCategoryWithAgents(req.params.category);
    res.json(scenarios);
  } catch (error: any) {
    console.error('Error fetching scenarios by category:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// GET /api/scenarios/:id - Get scenario by ID with agents
router.get('/:id', (req: Request, res: Response) => {
  try {
    const scenario = ScenarioModel.findByIdWithAgents(req.params.id);

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(scenario);
  } catch (error: any) {
    console.error('Error fetching scenario:', error);
    res.status(500).json({ error: 'Failed to fetch scenario' });
  }
});

// POST /api/scenarios - Create new scenario
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      topic,
      agentIds,
      difficultyLevel,
      estimatedDuration,
      recommendedFor,
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({ error: 'At least one agent is required' });
    }
    if (agentIds.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 agents allowed per scenario' });
    }

    const scenario = ScenarioModel.create({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      topic: topic.trim(),
      agentIds,
      difficultyLevel: difficultyLevel?.trim(),
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      recommendedFor: recommendedFor?.trim(),
    });

    // Return with agents populated
    const scenarioWithAgents = ScenarioModel.findByIdWithAgents(scenario.id);
    res.status(201).json(scenarioWithAgents);
  } catch (error: any) {
    console.error('Error creating scenario:', error);
    res.status(500).json({ error: 'Failed to create scenario' });
  }
});

// PUT /api/scenarios/:id - Update scenario
router.put('/:id', (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      topic,
      agentIds,
      difficultyLevel,
      estimatedDuration,
      recommendedFor,
    } = req.body;

    // Validate agent count if provided
    if (agentIds !== undefined) {
      if (!Array.isArray(agentIds) || agentIds.length === 0) {
        return res.status(400).json({ error: 'At least one agent is required' });
      }
      if (agentIds.length > 3) {
        return res.status(400).json({ error: 'Maximum 3 agents allowed per scenario' });
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (topic !== undefined) updateData.topic = topic.trim();
    if (agentIds !== undefined) updateData.agentIds = agentIds;
    if (difficultyLevel !== undefined) updateData.difficultyLevel = difficultyLevel.trim();
    if (estimatedDuration !== undefined) updateData.estimatedDuration = parseInt(estimatedDuration);
    if (recommendedFor !== undefined) updateData.recommendedFor = recommendedFor.trim();

    const scenario = ScenarioModel.update(req.params.id, updateData);

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Return with agents populated
    const scenarioWithAgents = ScenarioModel.findByIdWithAgents(scenario.id);
    res.json(scenarioWithAgents);
  } catch (error: any) {
    console.error('Error updating scenario:', error);
    res.status(500).json({ error: 'Failed to update scenario' });
  }
});

// DELETE /api/scenarios/:id - Delete scenario
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = ScenarioModel.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

export default router;
