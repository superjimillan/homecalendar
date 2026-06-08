import { Router, Request, Response } from 'express';
import { getAuthUrl, handleCallback, isAuthenticated, syncEmails, getPendingSuggestions, acceptSuggestion, rejectSuggestion } from '../services/gmail.js';
import { createEventFromGmail } from '../services/events.js';

const router = Router();

router.get('/auth-url', (req: Request, res: Response) => {
  const url = getAuthUrl();
  res.json({ url });
});

router.get('/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code');
  }

  try {
    await handleCallback(code);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/?gmail=connected`);
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

router.get('/status', async (req: Request, res: Response) => {
  const authenticated = await isAuthenticated();
  res.json({ authenticated });
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const result = await syncEmails();
    res.json(result);
  } catch (error) {
    console.error('Gmail sync error:', error);
    res.status(500).json({ error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/suggestions', (req: Request, res: Response) => {
  const suggestions = getPendingSuggestions();
  res.json({ suggestions });
});

router.post('/suggestions/:id/accept', (req: Request, res: Response) => {
  const { creator } = req.body;
  if (!creator || !['victor', 'sandra'].includes(creator)) {
    return res.status(400).json({ error: 'Invalid creator', message: 'Creator must be victor or sandra' });
  }

  const result = acceptSuggestion(req.params.id, creator);
  if (!result) {
    return res.status(404).json({ error: 'Not found', message: 'Suggestion not found or already processed' });
  }

  const { suggestion } = result;
  const event = createEventFromGmail({
    ...suggestion.suggestedEvent,
    creator,
    gmailMessageId: suggestion.messageId,
  } as any);

  res.json({ event, suggestion });
});

router.post('/suggestions/:id/reject', (req: Request, res: Response) => {
  const rejected = rejectSuggestion(req.params.id);
  if (!rejected) {
    return res.status(404).json({ error: 'Not found', message: 'Suggestion not found' });
  }
  res.status(204).send();
});

export default router;