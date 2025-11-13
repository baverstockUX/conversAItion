import { Router, Request, Response } from 'express';
import { TTSService } from '../services/tts.service';

const router = Router();

// GET /api/voices - Get available ElevenLabs voices
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!TTSService.isConfigured()) {
      return res.status(503).json({
        error: 'ElevenLabs API not configured',
      });
    }

    const voices = await TTSService.getVoices();
    res.json(voices);
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch voices' });
  }
});

export default router;
