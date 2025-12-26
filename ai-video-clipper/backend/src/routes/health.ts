import { Router, Request, Response } from 'express';
import { HealthResponse } from '../types';

const router = Router();

// GET /api/health - Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const health: HealthResponse = {
      status: 'ok',
      aiProvider: process.env.AI_PROVIDER || 'gemini',
      ffmpeg: 'ok' // We could actually check if ffmpeg is available here
    };
    
    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      aiProvider: 'unknown',
      ffmpeg: 'error'
    });
  }
});

export { router as healthRoutes };
