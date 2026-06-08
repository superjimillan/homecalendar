import { useMemo, useState } from 'react';
import { format, parseISO, isSameDay, getHours, getMinutes } from 'date-fns';
import type { Event } from '../../types';
import { getWeekDays, formatDateKey } from '../../utils/date';
import { useSwipe } from '../../hooks/useSwipe';

interface WeekViewProps {
  date: Date;
  events: Event[];
  selectedUser: 'victor' | 'sandra';
  onCreateEvent: (date: Date) => void;
  onEditEvent: (event: Event) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const SLOT_HEIGHT = 56;
const TOTAL_HEIGHT = HOURS.length * SLOT_HEIGHT;

export function WeekView({ date, events, onCreateEvent, onEditEvent, onNavigate }: WeekViewProps) {
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right' | null>(null);
  const days = useMemo(() => getWeekDays(date), [date]);
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

  const getEventsForDay = (day: Date): Event[] => {
    return events.filter(event => {
      const eventStart = parseISO(event.start);
      const eventEnd = parseISO(event.end);
      return isSameDay(eventStart, day) || (eventStart < day && eventEnd > day);
    });
  };

  const getAllDayEventsForDay = (day: Date): Event[] => getEventsForDay(day).filter(e => e.allDay);
  const getTimedEventsForDay = (day: Date): Event[] => getEventsForDay(day).filter(e => !e.allDay);

  const handleSlotClick = (day: Date, hour: number, minute: number = 0) => {
    const clickedDate = new Date(day);
    clickedDate.setHours(hour, minute, 0, 0);
    onCreateEvent(clickedDate);
  };

  const isToday = (day: Date): boolean => isSameDay(day, today);

  const getEventPosition = (event: Event, day: Date) => {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);
    const displayStart = isSameDay(eventStart, day) ? eventStart : new Date(day.setHours(7, 0, 0, 0));
    const displayEnd = isSameDay(eventEnd, day) ? eventEnd : new Date(day.setHours(21, 0, 0, 0));

    const startMinutes = (getHours(displayStart) - 7) * 60 + getMinutes(displayStart);
    const endMinutes = (getHours(displayEnd) - 7) * 60 + getMinutes(displayEnd);
    const totalMinutes = 14 * 60;

    const top = Math.max(0, (startMinutes / totalMinutes) * TOTAL_HEIGHT);
    const height = Math.max(20, ((endMinutes - startMinutes) / totalMinutes) * TOTAL_HEIGHT);

    return { top: `${top}px`, height: `${height}px`, displayStart, displayEnd };
  };

  return (
    <div {...swipeHandlers} className="pb-24 select-none">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] sticky top-[88px] z-30 bg-white border-b-2 border-gray-500 shadow-sm">
        <div className="p-2 border-r-2 border-gray-500 bg-gray-200" />
        {days.map(day => (
          <div
            key={formatDateKey(day)}
            className={`p-2 text-center border-r-2 border-gray-400 ${isToday(day) ? 'bg-victor-50' : ''}`}
          >
            <p className="text-[10px] font-black text-gray-600 uppercase">{format(day, 'EEE')}</p>
            <p className={`text-sm font-black mt-0.5 ${isToday(day) ? 'text-victor-600' : 'text-gray-900'}`}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b-2 border-gray-500 bg-gray-100">
        <div className="p-2 border-r-2 border-gray-500 flex items-start justify-end bg-gray-200">
          <span className="text-[10px] font-black text-gray-700 uppercase">All</span>
        </div>
        {days.map(day => {
          const allDay = getAllDayEventsForDay(day);
          return (
            <div
              key={`allday-${formatDateKey(day)}`}
              onClick={() => onCreateEvent(new Date(day.setHours(0, 0, 0, 0)))}
              className="min-h-[44px] p-1 border-r-2 border-gray-300"
            >
              <div className="flex flex-col gap-0.5">
                {allDay.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                    className="px-1.5 py-0.5 rounded text-[9px] font-black text-white truncate touch-target border border-white/40 shadow-sm"
                    style={{ backgroundColor: event.color }}
                  >
                    {event.title}
                  </div>
                ))}
                {allDay.length > 2 && (
                  <span className="text-[9px] text-gray-700 font-bold text-center">+{allDay.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid with events integrated */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)]" style={{ height: `${TOTAL_HEIGHT}px` }}>
            {/* Time labels column */}
            <div className="relative border-r-2 border-gray-500 bg-gray-100">
              {HOURS.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute right-0 pr-2 text-right"
                  style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                >
                  <span className="text-[11px] font-black text-gray-700">{format(new Date(2000, 0, 1, hour, 0), 'h a')}</span>
                </div>
              ))}
              {/* Horizontal hour lines */}
              {HOURS.map((hour, i) => (
                <div
                  key={`line-${hour}`}
                  className="absolute left-0 right-0 border-b-2 border-gray-300"
                  style={{ top: `${(i + 1) * SLOT_HEIGHT}px` }}
                />
              ))}
            </div>

            {/* Day columns with events */}
            {days.map(day => {
              const timedEvents = getTimedEventsForDay(day);
              return (
                <div
                  key={formatDateKey(day)}
                  className={`relative border-r-2 border-gray-300 ${isToday(day) ? 'bg-victor-50/10' : ''}`}
                >
                  {/* Hour slot backgrounds with click handlers */}
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      onClick={() => handleSlotClick(day, hour)}
                      className={`absolute left-0 right-0 border-b border-gray-200 hover:bg-victor-50/20 touch-target ${i % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}`}
                      style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                    >
                      <div
                        onClick={(e) => { e.stopPropagation(); handleSlotClick(day, hour, 30); }}
                        className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-300"
                      />
                    </div>
                  ))}

                  {/* Events */}
                  {timedEvents.map(event => {
                    const { top, height, displayStart, displayEnd } = getEventPosition(event, day);
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                        className="absolute left-0.5 right-0.5 rounded-md shadow-md pointer-events-auto z-10 overflow-hidden border-2 border-white"
                        style={{ top, height, backgroundColor: event.color, minHeight: '20px' }}
                      >
                        <div className="p-1 text-white text-[9px] leading-tight">
                          <p className="font-black truncate">{event.title}</p>
                          <p className="opacity-90 truncate font-semibold">{format(displayStart, 'h:mm')} - {format(displayEnd, 'h:mm')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}