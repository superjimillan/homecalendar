import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import type { Event, User } from '../types';

interface EventModalProps {
  event?: Event;
  initialDate?: Date;
  selectedUser: User;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function EventModal({ event, initialDate, selectedUser, onSave, onDelete, onClose }: EventModalProps) {
  const isEditing = !!event;
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const getInitialStart = () => {
    if (event) return format(parseISO(event.start), "yyyy-MM-dd'T'HH:mm");
    if (initialDate) {
      const rounded = new Date(initialDate);
      rounded.setMinutes(Math.ceil(rounded.getMinutes() / 30) * 30, 0, 0);
      return format(rounded, "yyyy-MM-dd'T'HH:mm");
    }
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    return format(now, "yyyy-MM-dd'T'HH:mm");
  };

  const getInitialEnd = () => {
    if (event) return format(parseISO(event.end), "yyyy-MM-dd'T'HH:mm");
    const start = new Date(getInitialStart());
    start.setHours(start.getHours() + 1);
    return format(start, "yyyy-MM-dd'T'HH:mm");
  };

  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [start, setStart] = useState(getInitialStart());
  const [end, setEnd] = useState(getInitialEnd());
  const [allDay, setAllDay] = useState(event?.allDay || false);
  const [creator, setCreator] = useState<User>(event?.creator || selectedUser);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!allDay) {
      if (!start) newErrors.start = 'Start time is required';
      if (!end) newErrors.end = 'End time is required';
      if (start && end && new Date(start) >= new Date(end)) {
        newErrors.end = 'End must be after start';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startDate = allDay
      ? format(new Date(start.split('T')[0]), "yyyy-MM-dd'T'00:00:00.000'Z'")
      : new Date(start).toISOString();
    const endDate = allDay
      ? format(new Date(end.split('T')[0]), "yyyy-MM-dd'T'23:59:59.000'Z'")
      : new Date(end).toISOString();

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      start: startDate,
      end: endDate,
      allDay,
      creator,
    };

    if (isEditing && event) {
      onSave({ id: event.id, ...data });
    } else {
      onSave(data);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) handleClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center safe-top safe-bottom transition-opacity duration-250 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className={`bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto shadow-2xl transition-transform duration-250 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}
      >
        <div className="bottom-sheet-handle" />

        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={handleClose} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 touch-target">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'Edit Event' : 'New Event'}</h2>
            {isEditing ? (
              <button
                onClick={() => { if (event && window.confirm('Delete this event?')) { onDelete(event.id); handleClose(); } }}
                className="p-2 -mr-2 rounded-xl hover:bg-red-50 text-red-500 touch-target"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            ) : (
              <div className="w-9" />
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="label">Title</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`input ${errors.title ? 'input-error' : ''}`}
                placeholder="What is this event?"
                autoFocus
              />
              {errors.title && <p className="mt-1 text-sm text-red-500 font-medium">{errors.title}</p>}
            </div>

            {/* All day toggle */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-gray-700">All day event</span>
              <button
                type="button"
                onClick={() => setAllDay(!allDay)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${allDay ? 'bg-victor-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${allDay ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Date/time inputs */}
            <div className={`grid gap-3 ${allDay ? 'grid-cols-2' : 'grid-cols-2'}`}>
              <div>
                <label className="label">{allDay ? 'Start date' : 'Start'}</label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={allDay ? start.split('T')[0] : start}
                  onChange={(e) => setStart(allDay ? e.target.value + 'T00:00' : e.target.value)}
                  className={`input ${errors.start ? 'input-error' : ''}`}
                />
              </div>
              <div>
                <label className="label">{allDay ? 'End date' : 'End'}</label>
                <input
                  type={allDay ? 'date' : 'datetime-local'}
                  value={allDay ? end.split('T')[0] : end}
                  onChange={(e) => setEnd(allDay ? e.target.value + 'T23:59' : e.target.value)}
                  className={`input ${errors.end ? 'input-error' : ''}`}
                />
              </div>
            </div>
            {(errors.start || errors.end) && (
              <p className="text-sm text-red-500 font-medium">{errors.start || errors.end}</p>
            )}

            {/* Description */}
            <div>
              <label htmlFor="description" className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input resize-none"
                rows={2}
                placeholder="Add details..."
              />
            </div>

            {/* Creator */}
            <div>
              <label className="label">Created by</label>
              <div className="grid grid-cols-2 gap-3">
                {(['victor', 'sandra'] as User[]).map(user => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => setCreator(user)}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all touch-target font-bold ${
                      creator === user
                        ? user === 'victor'
                          ? 'border-victor-500 bg-victor-50 text-victor-700 shadow-sm'
                          : 'border-sandra-500 bg-sandra-50 text-sandra-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      user === 'victor' ? 'bg-victor-500' : 'bg-sandra-500'
                    }`}>
                      {user === 'victor' ? 'V' : 'S'}
                    </span>
                    {user === 'victor' ? 'Victor' : 'Sandra'}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="w-full btn-primary text-base py-3.5 mt-2">
              {isEditing ? 'Save Changes' : 'Add Event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}