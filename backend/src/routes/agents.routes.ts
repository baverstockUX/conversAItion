import { Router, Request, Response } from 'express';
import { AgentModel } from '../models/agent.model';
import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const router = Router();

// Configure multer for avatar uploads
const uploadDir = join(__dirname, '../../uploads/avatars');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = file.originalname.split('.').pop();
    cb(null, `avatar-${uniqueSuffix}.${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

// GET /api/agents - List all agents
router.get('/', (req: Request, res: Response) => {
  try {
    const agents = AgentModel.findAll();
    res.json(agents);
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id - Get agent by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const agent = AgentModel.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error: any) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// POST /api/agents - Create new agent
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, role, persona, voiceId, avatarUrl } = req.body;

    // Validation
    if (!name || !role || !persona || !voiceId || !avatarUrl) {
      return res.status(400).json({
        error: 'Missing required fields: name, role, persona, voiceId, avatarUrl',
      });
    }

    const agent = AgentModel.create({
      name: name.trim(),
      role: role.trim(),
      persona: persona.trim(),
      voiceId: voiceId.trim(),
      avatarUrl: avatarUrl.trim(),
    });

    res.status(201).json(agent);
  } catch (error: any) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, role, persona, voiceId, avatarUrl } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (role) updateData.role = role.trim();
    if (persona) updateData.persona = persona.trim();
    if (voiceId) updateData.voiceId = voiceId.trim();
    if (avatarUrl) updateData.avatarUrl = avatarUrl.trim();

    const agent = AgentModel.update(req.params.id, updateData);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error: any) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const success = AgentModel.delete(req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// POST /api/agents/upload-avatar - Upload avatar image
router.post('/upload-avatar', upload.single('avatar'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    res.json({ avatarUrl });
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;
