import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';
import { USER_COLORS } from '../types.js';

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

const events = [
  {
    id: uuidv4(),
    title: 'Team Meeting',
    description: 'Weekly team sync',
    start: addHours(today, 9).toISOString(),
    end: addHours(today, 10).toISOString(),
    allDay: 0,
    creator: 'victor' as const,
    color: USER_COLORS.victor,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: 'manual' as const,
  },
  {
    id: uuidv4(),
    title: 'Dentist Appointment',
    description: 'Regular checkup',
    start: addDays(today, 1).toISOString(),
    end: addDays(today, 1).toISOString(),
    allDay: 1,
    creator: 'sandra' as const,
    color: USER_COLORS.sandra,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: 'manual' as const,
  },
  {
    id: uuidv4(),
    title: 'Project Deadline',
    description: 'Submit Q2 deliverables',
    start: addDays(today, 3).toISOString(),
    end: addDays(today, 3).toISOString(),
    allDay: 1,
    creator: 'victor' as const,
    color: USER_COLORS.victor,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: 'manual' as const,
  },
  {
    id: uuidv4(),
    title: 'Parent Teacher Conference',
    description: 'Belmayne ETNS',
    start: addHours(addDays(today, 5), 15).toISOString(),
    end: addHours(addDays(today, 5), 16).toISOString(),
    allDay: 0,
    creator: 'sandra' as const,
    color: USER_COLORS.sandra,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: 'manual' as const,
  },
  {
    id: uuidv4(),
    title: 'Gym Session',
    description: 'Evening workout',
    start: addHours(today, 18).toISOString(),
    end: addHours(today, 19).toISOString(),
    allDay: 0,
    creator: 'victor' as const,
    color: USER_COLORS.victor,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    source: 'manual' as const,
  },
];

const insertEvent = db.prepare(`
  INSERT INTO events (id, title, description, start, end, all_day, creator, color, created_at, updated_at, source)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const event of events) {
  insertEvent.run(
    event.id,
    event.title,
    event.description,
    event.start,
    event.end,
    event.allDay,
    event.creator,
    event.color,
    event.createdAt,
    event.updatedAt,
    event.source
  );
}

console.log(`Seeded ${events.length} events`);