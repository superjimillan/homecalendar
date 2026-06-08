import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, isSameDay, parseISO, getHours, getMinutes, setHours, setMinutes } from 'date-fns';
import type { Event } from '../types';

export function getViewDateRange(date: Date, mode: 'day' | 'week' | 'month'): { start: Date; end: Date } {
  switch (mode) {
    case 'day':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'week':
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(date), end: endOfMonth(date) };
  }
}

export function navigateDate(date: Date, mode: 'day' | 'week' | 'month', direction: 'prev' | 'next'): Date {
  const multiplier = direction === 'prev' ? -1 : 1;
  switch (mode) {
    case 'day':
      return addDays(date, multiplier);
    case 'week':
      return addWeeks(date, multiplier);
    case 'month':
      return addMonths(date, multiplier);
  }
}

export function formatDateHeader(date: Date, mode: 'day' | 'week' | 'month'): string {
  switch (mode) {
    case 'day':
      return format(date, 'EEEE, MMMM d, yyyy');
    case 'week':
      return `${format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(date, { weekStartsOn: 1 }), 'MMM d, yyyy')}`;
    case 'month':
      return format(date, 'MMMM yyyy');
  }
}

export function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getDayEvents(events: Event[], date: Date): Event[] {
  return events.filter(event => {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);
    return isSameDay(eventStart, date) || (eventStart < date && eventEnd > date);
  });
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthWeeks(date: Date): Date[][] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const firstWeekStart = startOfWeek(start, { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(end, { weekStartsOn: 1 });

  const weeks: Date[][] = [];
  let current = firstWeekStart;

  while (current <= lastWeekEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(addDays(current, i));
    }
    weeks.push(week);
    current = addWeeks(current, 1);
  }

  return weeks;
}

export function eventOverlaps(event1: any, event2: any): boolean {
  const start1 = parseISO(event1.start);
  const end1 = parseISO(event1.end);
  const start2 = parseISO(event2.start);
  const end2 = parseISO(event2.end);
  return start1 < end2 && end1 > start2;
}

export function getEventPosition(event: any, date: Date): { top: number; height: number } {
  const eventStart = parseISO(event.start);
  const eventEnd = parseISO(event.end);
  const dayStart = startOfDay(date);

  const startMinutes = Math.max(0, (eventStart.getTime() - dayStart.getTime()) / 60000);
  const endMinutes = Math.min(24 * 60, (eventEnd.getTime() - dayStart.getTime()) / 60000);

  const top = (startMinutes / (24 * 60)) * 100;
  const height = Math.max(2, ((endMinutes - startMinutes) / (24 * 60)) * 100);

  return { top, height };
}

export function createDateTime(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  return setMinutes(setHours(date, hours), minutes);
}

export function getTimeString(date: Date): string {
  return `${String(getHours(date)).padStart(2, '0')}:${String(getMinutes(date)).padStart(2, '0')}`;
}