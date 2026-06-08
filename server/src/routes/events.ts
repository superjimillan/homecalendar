import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getEventsInRange, createEvent, updateEventById, deleteEventById, createEventFromGmail } from '../services/events.js';
import { Event, CreateEventInput, UpdateEventInput } from '../types.js';

const router = Router();

const eventsQuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  allDay: z.boolean(),
  creator: z.enum(['victor', 'sandra']),
});

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  creator: z.enum(['victor', 'sandra']).optional(),
});

router.get('/', (req: Request, res: Response) => {
  const parsed = eventsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query', message: parsed.error.message, statusCode: 400 });
  }

  const start = new Date(parsed.data.start);
  const end = new Date(parsed.data.end);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date', message: 'Start and end must be valid dates', statusCode: 400 });
  }

  try {
    const events = getEventsInRange(start, end);
    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal error', message: 'Failed to fetch events', statusCode: 500 });
  }
});

router.post('/', (req: Request, res: Response) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', message: parsed.error.message, statusCode: 400 });
  }

  try {
    const event = createEvent(parsed.data);
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal error', message: 'Failed to create event', statusCode: 500 });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const parsed = updateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', message: parsed.error.message, statusCode: 400 });
  }

  try {
    const event = updateEventById(req.params.id, parsed.data);
    if (!event) {
      return res.status(404).json({ error: 'Not found', message: 'Event not found', statusCode: 404 });
    }
    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal error', message: 'Failed to update event', statusCode: 500 });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteEventById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not found', message: 'Event not found', statusCode: 404 });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal error', message: 'Failed to delete event', statusCode: 500 });
  }
});

router.post('/from-gmail', (req: Request, res: Response) => {
  const schema = createEventSchema.extend({
    gmailMessageId: z.string(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', message: parsed.error.message, statusCode: 400 });
  }

  try {
    const event = createEventFromGmail(parsed.data);
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event from Gmail error:', error);
    res.status(500).json({ error: 'Internal error', message: 'Failed to create event from Gmail', statusCode: 500 });
  }
});

export default router;