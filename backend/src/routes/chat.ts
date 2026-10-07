import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { ragService } from '../services/rag.service';
import { vectorService } from '../services/vector.service';

const router = Router();

interface ChatRequest {
  message: string;
  conversationId?: string;
  maxSources?: number;
  similarityThreshold?: number;
  includeHistory?: boolean;
}

// POST /api/chat - Send a message to the chatbot
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      message,
      conversationId,
      maxSources,
      similarityThreshold,
      includeHistory
    }: ChatRequest = req.body;

    if (!message || typeof message !== 'string') {
      throw new ApiError(400, 'Message is required and must be a string');
    }

    // Use RAG service to process the query
    const result = await ragService.query(message, conversationId, {
      maxSources,
      similarityThreshold,
      includeHistory
    });

    res.json({
      success: true,
      data: {
        message: result.answer,
        conversationId: result.conversationId,
        timestamp: new Date().toISOString(),
        sources: result.sources,
        sourceCount: result.sources.length,
        usage: result.usage
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/history/:conversationId - Get conversation history
router.get('/history/:conversationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId } = req.params;

    const history = await ragService.getHistory(conversationId);

    if (!history) {
      throw new ApiError(404, 'Conversation not found');
    }

    res.json({
      success: true,
      data: {
        conversationId: history.conversation.id,
        messages: history.messages,
        createdAt: history.conversation.created_at,
        updatedAt: history.conversation.updated_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/chat/ingest - Ingest documents into the vector database
router.post('/ingest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      throw new ApiError(400, 'Documents array is required and must not be empty');
    }

    const results = await ragService.ingestDocuments(documents);

    res.json({
      success: true,
      data: {
        ingested: results.length,
        results
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/stats - Get vector database statistics
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await vectorService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

export default router;