import { useMemo, useEffect, useState } from 'react';
import { parseISO, isSameDay, getHours, getMinutes, format } from 'date-fns';
import type { Event } from '../../types';
import { getDayEvents, formatTime } from '../../utils/date';
import { useSwipe } from '../../hooks/useSwipe';

interface DayViewProps {
  date: Date;
  events: Event[];
  selectedUser: 'victor' | 'sandra';
  onCreateEvent: (date: Date) => void;
  onEditEvent: (event: Event) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

export function DayView({ date, events, onCreateEvent, onEditEvent, onNavigate }: DayViewProps) {
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const dayEvents = useMemo(() => getDayEvents(events, date), [events, date]);
  const allDayEvents = useMemo(() => dayEvents.filter((e: Event) => e.allDay), [dayEvents]);
  const timedEvents = useMemo(() => dayEvents.filter((e: Event) => !e.allDay), [dayEvents]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isToday = isSameDay(date, new Date());

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

  const handleSlotClick = (hour: number, minute: number = 0) => {
    const clickedDate = new Date(date);
    clickedDate.setHours(hour, minute, 0, 0);
    onCreateEvent(clickedDate);
  };

  const getEventStyle = (event: Event) => {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);
    const displayStart = isSameDay(eventStart, date) ? eventStart : new Date(date.setHours(6, 0, 0, 0));
    const displayEnd = isSameDay(eventEnd, date) ? eventEnd : new Date(date.setHours(23, 59, 0, 0));

    const startMinutes = (getHours(displayStart) - 6) * 60 + getMinutes(displayStart);
    const endMinutes = (getHours(displayEnd) - 6) * 60 + getMinutes(displayEnd);
    const totalMinutes = 18 * 60;

    const top = Math.max(0, (startMinutes / totalMinutes) * 100);
    const height = Math.max(3, ((endMinutes - startMinutes) / totalMinutes) * 100);

    return { top: `${top}%`, height: `${height}%` };
  };

  const currentTimePosition = useMemo(() => {
    if (!isToday) return null;
    const minutes = (getHours(currentTime) - 6) * 60 + getMinutes(currentTime);
    const totalMinutes = 18 * 60;
    return `${(minutes / totalMinutes) * 100}%`;
  }, [currentTime, isToday, date]);

  return (
    <div
      {...swipeHandlers}
      className={`pb-24 select-none ${animationDirection === 'left' ? 'animate-slide-left' : animationDirection === 'right' ? 'animate-slide-right' : ''}`}
    >
      {/* Date header */}
      <div className="px-4 py-3 text-center border-b-2 border-gray-300 bg-white/95 backdrop-blur-sm sticky top-[88px] z-30 shadow-sm">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{format(date, 'EEEE')}</p>
        <div className="flex items-center justify-center gap-2 mt-0.5">
          <span className={`text-2xl font-black ${isToday ? 'text-victor-600' : 'text-gray-900'}`}>
            {format(date, 'd')}
          </span>
          {isToday && <span className="today-badge">Today</span>}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-3 py-2 border-b-2 border-gray-300 bg-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">All Day</span>
            <div className="flex-1 h-0.5 bg-gray-400" />
          </div>
          <div className="flex flex-col gap-1.5">
            {allDayEvents.map(event => (
              <div
                key={event.id}
                onClick={() => onEditEvent(event)}
                className="event-card-all-day touch-target flex items-center gap-2 border-l-4"
                style={{ backgroundColor: event.color + '20', color: event.color, borderColor: event.color }}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: event.color }} />
                <span className="truncate font-bold">{event.title}</span>
                <span className="ml-auto text-[10px] opacity-70 font-black bg-white/50 px-1.5 rounded">{event.creator === 'victor' ? 'V' : 'S'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="relative">
        {/* Hour labels + slots */}
        {HOURS.map((hour, index) => (
          <div key={hour} className={`flex min-h-[72px] ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
            {/* Time label */}
            <div className="w-16 flex-shrink-0 flex items-start justify-end pr-2 pt-2 border-r-2 border-gray-400 bg-gray-100">
              <span className="text-xs font-black text-gray-700">{formatTime(new Date(2000, 0, 1, hour, 0))}</span>
            </div>

            {/* Time slot */}
            <div
              onClick={() => handleSlotClick(hour)}
              className="flex-1 border-b border-gray-300 hover:bg-victor-50/40 transition-colors touch-target relative"
            >
              {/* Half-hour marker - stronger */}
              <div
                onClick={(e) => { e.stopPropagation(); handleSlotClick(hour, 30); }}
                className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-300"
              />
            </div>
          </div>
        ))}

        {/* Current time indicator */}
        {currentTimePosition && (
          <div
            className="absolute left-16 right-0 z-20 pointer-events-none flex items-center"
            style={{ top: currentTimePosition }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-md -ml-1.5 z-30" />
            <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
          </div>
        )}

        {/* Events overlay */}
        <div className="absolute inset-0 left-16 pointer-events-none">
          {timedEvents.map(event => {
            const style = getEventStyle(event);
            return (
              <div
                key={event.id}
                onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                className="absolute left-1 right-1 rounded-lg shadow-lg pointer-events-auto z-10 overflow-hidden border-2 border-white"
                style={{
                  top: style.top,
                  height: style.height,
                  backgroundColor: event.color,
                  minHeight: '28px',
                }}
              >
                <div className="p-1.5 text-white h-full flex flex-col justify-center">
                  <p className="font-black text-xs leading-tight truncate">{event.title}</p>
                  <p className="text-[10px] opacity-90 leading-tight truncate mt-0.5 font-semibold">
                    {format(parseISO(event.start), 'h:mm')} - {format(parseISO(event.end), 'h:mm')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}