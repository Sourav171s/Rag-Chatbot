import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'RAG Chatbot API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;