import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { streamChat } from '../services/openai.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).max(20).optional(),
});

router.post('/', async (req: Request, res: Response) => {
  console.log('[Chat] Received body:', JSON.stringify(req.body));
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('[Chat] Validation failed:', parsed.error.errors);
    return res.status(400).json({ error: 'Invalid input', message: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), statusCode: 400 });
  }

  const { message, history = [] } = parsed.data;

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await streamChat(message, history);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Failed to process chat' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

export default router;