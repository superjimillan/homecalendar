import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { Event, CreateEventInput, UpdateEventInput, User, USER_COLORS } from '../types.js';

const selectEvent = db.prepare('SELECT * FROM events WHERE id = ?');
const selectEventsInRange = db.prepare(`
  SELECT * FROM events 
  WHERE start < ? AND end > ?
  ORDER BY start ASC
`);
const insertEvent = db.prepare(`
  INSERT INTO events (id, title, description, start, end, all_day, creator, color, created_at, updated_at, source, gmail_message_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updateEvent = db.prepare(`
  UPDATE events 
  SET title = COALESCE(?, title),
      description = COALESCE(?, description),
      start = COALESCE(?, start),
      end = COALESCE(?, end),
      all_day = COALESCE(?, all_day),
      creator = COALESCE(?, creator),
      color = COALESCE(?, color),
      updated_at = ?,
      source = COALESCE(?, source),
      gmail_message_id = COALESCE(?, gmail_message_id)
  WHERE id = ?
`);
const deleteEvent = db.prepare('DELETE FROM events WHERE id = ?');

function rowToEvent(row: any): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    start: row.start,
    end: row.end,
    allDay: Boolean(row.all_day),
    creator: row.creator,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source,
    gmailMessageId: row.gmail_message_id,
  };
}

export function getEventById(id: string): Event | null {
  const row = selectEvent.get(id);
  return row ? rowToEvent(row) : null;
}

export function getEventsInRange(start: Date, end: Date): Event[] {
  const rows = selectEventsInRange.all(end.toISOString(), start.toISOString());
  return rows.map(rowToEvent);
}

export function createEvent(input: CreateEventInput): Event {
  const now = new Date().toISOString();
  const id = uuidv4();
  const event: Event = {
    id,
    title: input.title,
    description: input.description,
    start: input.start,
    end: input.end,
    allDay: input.allDay,
    creator: input.creator,
    color: USER_COLORS[input.creator],
    createdAt: now,
    updatedAt: now,
    source: 'manual',
  };

  insertEvent.run(
    event.id,
    event.title,
    event.description,
    event.start,
    event.end,
    event.allDay ? 1 : 0,
    event.creator,
    event.color,
    event.createdAt,
    event.updatedAt,
    event.source,
    null
  );

  return event;
}

export function updateEventById(id: string, input: UpdateEventInput): Event | null {
  const existing = getEventById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const color = input.creator ? USER_COLORS[input.creator] : existing.color;

  updateEvent.run(
    input.title ?? null,
    input.description ?? null,
    input.start ?? null,
    input.end ?? null,
    input.allDay !== undefined ? (input.allDay ? 1 : 0) : null,
    input.creator ?? null,
    color,
    now,
    input.source ?? null,
    null,
    id
  );

  return getEventById(id);
}

export function deleteEventById(id: string): boolean {
  const result = deleteEvent.run(id);
  return result.changes > 0;
}

export function createEventFromGmail(input: CreateEventInput & { gmailMessageId: string }): Event {
  const now = new Date().toISOString();
  const id = uuidv4();
  const event: Event = {
    id,
    title: input.title,
    description: input.description,
    start: input.start,
    end: input.end,
    allDay: input.allDay,
    creator: input.creator,
    color: USER_COLORS[input.creator],
    createdAt: now,
    updatedAt: now,
    source: 'gmail',
    gmailMessageId: input.gmailMessageId,
  };

  insertEvent.run(
    event.id,
    event.title,
    event.description,
    event.start,
    event.end,
    event.allDay ? 1 : 0,
    event.creator,
    event.color,
    event.createdAt,
    event.updatedAt,
    event.source,
    event.gmailMessageId
  );

  return event;
}