import { useMemo, useState } from 'react';
import { format, parseISO, isSameDay, isSameMonth } from 'date-fns';
import type { Event } from '../../types';
import { getMonthWeeks, formatDateKey } from '../../utils/date';
import { useSwipe } from '../../hooks/useSwipe';

interface MonthViewProps {
  date: Date;
  events: Event[];
  selectedUser: 'victor' | 'sandra';
  onCreateEvent: (date: Date) => void;
  onEditEvent: (event: Event) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function MonthView({ date, events, onCreateEvent, onEditEvent, onNavigate }: MonthViewProps) {
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const weeks = useMemo(() => getMonthWeeks(date), [date]);
  const today = new Date();

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      setAnimationDirection('left');
      onNavigate?.('next');
      setTimeout(() => setAnimationDirection(null), 300);
    },
    onSwipeRight: () => {
      setAnimationDirection('right');
      onNavigate?.('prev');
      setTimeout(() => setAnimationDirection(null), 300);
    },
    threshold: 60,
  });

  const isToday = (day: Date): boolean => isSameDay(day, today);
  const isCurrentMonth = (day: Date): boolean => isSameMonth(day, date);

  const dayEvents = (day: Date): Event[] => {
    return events.filter(event => {
      const eventStart = parseISO(event.start);
      const eventEnd = parseISO(event.end);
      return isSameDay(eventStart, day) || (eventStart < day && eventEnd > day);
    });
  };

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div {...swipeHandlers} className="pb-24 select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b-2 border-gray-400 bg-gray-100">
        {DAY_NAMES.map(day => (
          <div key={day} className="text-center py-2 border-r border-gray-300 last:border-r-0">
            <span className="text-[11px] font-black text-gray-600 uppercase tracking-wider">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-300">
            {week.map(day => {
              const eventsForDay = dayEvents(day);
              const allDay = eventsForDay.filter(e => e.allDay);
              const timed = eventsForDay.filter(e => !e.allDay);
              const dayKey = formatDateKey(day);

              return (
                <div
                  key={dayKey}
                  onClick={() => onCreateEvent(day)}
                  className={`min-h-[90px] sm:min-h-[110px] p-1 border-r border-gray-300 last:border-r-0 touch-target transition-colors ${
                    isToday(day)
                      ? 'bg-victor-50/60'
                      : isCurrentMonth(day)
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-gray-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-black ${
                      isToday(day) ? 'bg-victor-600 text-white shadow-md' : isCurrentMonth(day) ? 'text-gray-800' : 'text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {eventsForDay.length > 0 && (
                      <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {eventsForDay.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {allDay.slice(0, 1).map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                        className="px-1.5 py-0.5 rounded text-[9px] font-black text-white truncate touch-target border border-white/30 shadow-sm"
                        style={{ backgroundColor: event.color }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {timed.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                        className="px-1 py-0.5 rounded text-[9px] font-bold truncate touch-target flex items-center gap-1"
                        style={{
                          borderLeft: `3px solid ${event.color}`,
                          backgroundColor: event.color + '15',
                          color: '#374151',
                        }}
                      >
                        <span className="text-[8px] opacity-70 font-black">{format(parseISO(event.start), 'h:mm')}</span>
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                    {eventsForDay.length > 4 && (
                      <span className="text-[9px] text-gray-500 font-bold ml-0.5">
                        +{eventsForDay.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}