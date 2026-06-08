import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MonthView } from './components/views/MonthView';
import { EventModal } from './components/EventModal';
import { ChatWidget } from './components/ChatWidget';
import { ToastContainer, useToast } from './components/Toast';
import { api } from './utils/api';
import { getViewDateRange, navigateDate, formatDateHeader } from './utils/date';
import type { Event, User, GmailSuggestion } from './types';
import type { CalendarState, GmailSyncStatus } from './types';

function App() {
  const [state, setState] = useState<CalendarState>({
    currentDate: new Date(),
    viewMode: 'week',
    selectedUser: 'victor',
    events: [],
    isLoading: true,
  });
  const [gmailStatus, setGmailStatus] = useState<GmailSyncStatus>({
    authenticated: false,
    pendingSuggestions: 0,
  });
  const [showEventModal, setShowEventModal] = useState<{ event?: Event; date?: Date }>({});
  const [gmailSuggestions, setGmailSuggestions] = useState<GmailSuggestion[]>([]);
  const [showGmailSuggestions, setShowGmailSuggestions] = useState(false);
  const [gmailAutoSyncDone, setGmailAutoSyncDone] = useState(false);
  const { toast } = useToast();

  const loadEvents = useCallback(async (date?: Date) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const d = date || state.currentDate;
      const { start, end } = getViewDateRange(d, 'month');
      const { events } = await api.events.list(start, end);
      setState(prev => ({ ...prev, events, isLoading: false }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load events';
      toast(msg, 'error');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast]);

  const loadGmailStatus = useCallback(async () => {
    try {
      const status = await api.gmail.status();
      setGmailStatus(prev => ({ ...prev, authenticated: status.authenticated }));
      if (status.authenticated) {
        const { suggestions } = await api.gmail.suggestions();
        const pending = suggestions.filter(s => s.status === 'pending');
        setGmailStatus(prev => ({ ...prev, pendingSuggestions: pending.length }));
        setGmailSuggestions(pending);
      }
    } catch {
      // Gmail not configured - that's fine
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadGmailStatus();
  }, [loadGmailStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname);
      toast('Gmail connected successfully! Syncing emails...', 'success');
      loadGmailStatus().then(() => {
        handleSyncGmail();
      });
    }
  }, []);

  const handleApiError = (error: unknown, defaultMsg: string) => {
    const msg = error instanceof Error ? error.message : defaultMsg;
    toast(msg, 'error');
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      const event = await api.events.create(eventData);
      setState(prev => ({ ...prev, events: [...prev.events, event] }));
      toast('Event created', 'success');
      setShowEventModal({});
    } catch (error) {
      handleApiError(error, 'Failed to create event');
    }
  };

  const handleUpdateEvent = async (id: string, eventData: any) => {
    try {
      const event = await api.events.update(id, eventData);
      setState(prev => ({
        ...prev,
        events: prev.events.map(e => e.id === id ? event : e),
      }));
      toast('Event updated', 'success');
      setShowEventModal({});
    } catch (error) {
      handleApiError(error, 'Failed to update event');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await api.events.delete(id);
      setState(prev => ({
        ...prev,
        events: prev.events.filter(e => e.id !== id),
      }));
      toast('Event deleted', 'success');
      setShowEventModal({});
    } catch (error) {
      handleApiError(error, 'Failed to delete event');
    }
  };

  const handleAcceptSuggestion = async (suggestion: GmailSuggestion, creator: User) => {
    try {
      const { event } = await api.gmail.acceptSuggestion(suggestion.id, creator);
      setState(prev => ({ ...prev, events: [...prev.events, event] }));
      setGmailSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      setGmailStatus(prev => ({ ...prev, pendingSuggestions: prev.pendingSuggestions - 1 }));
      toast('Event added from email', 'success');
    } catch (error) {
      handleApiError(error, 'Failed to add event');
    }
  };

  const handleRejectSuggestion = async (id: string) => {
    try {
      await api.gmail.rejectSuggestion(id);
      setGmailSuggestions(prev => prev.filter(s => s.id !== id));
      setGmailStatus(prev => ({ ...prev, pendingSuggestions: prev.pendingSuggestions - 1 }));
      toast('Suggestion dismissed', 'info');
    } catch (error) {
      handleApiError(error, 'Failed to dismiss suggestion');
    }
  };

  const handleSyncGmail = async () => {
    try {
      toast('Syncing emails...', 'info');
      const result = await api.gmail.sync();
      await loadGmailStatus();
      toast(`Found ${result.suggestions} new suggestions`, 'success');
    } catch (error) {
      handleApiError(error, 'Failed to sync emails');
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { url } = await api.gmail.authUrl();
      window.location.href = url;
    } catch (error) {
      handleApiError(error, 'Failed to start Gmail connection');
    }
  };

  const navigate = (direction: 'prev' | 'next') => {
    setState(prev => {
      const nextDate = navigateDate(prev.currentDate, 'month', direction);
      loadEvents(nextDate);
      return { ...prev, currentDate: nextDate };
    });
  };

  const goToToday = () => {
    const today = new Date();
    loadEvents(today);
    setState(prev => ({ ...prev, currentDate: today }));
  };

  return (
    <ToastContainer>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header
          currentDate={state.currentDate}
          viewMode={'month'}
          onViewModeChange={() => {}}
          onNavigate={navigate}
          onToday={goToToday}
          selectedUser={state.selectedUser}
          onUserChange={(user: User) => setState(prev => ({ ...prev, selectedUser: user }))}
          gmailStatus={gmailStatus}
          onConnectGmail={handleConnectGmail}
          onSyncGmail={handleSyncGmail}
          showGmailSuggestions={showGmailSuggestions}
          onToggleGmailSuggestions={setShowGmailSuggestions}
          gmailSuggestions={gmailSuggestions}
          onAcceptSuggestion={handleAcceptSuggestion}
          onRejectSuggestion={handleRejectSuggestion}
          dateHeader={formatDateHeader(state.currentDate, 'month')}
        />

        <main className="flex-1 overflow-auto pb-24">
          <MonthView
            date={state.currentDate}
            events={state.events}
            selectedUser={state.selectedUser}
            onCreateEvent={(date) => setShowEventModal({ date })}
            onEditEvent={(event) => setShowEventModal({ event })}
            onNavigate={navigate}
          />
        </main>

        {showEventModal.event || showEventModal.date ? (
          <EventModal
            event={showEventModal.event}
            initialDate={showEventModal.date}
            selectedUser={state.selectedUser}
            onSave={(data: any) => {
              if (data.id) {
                handleUpdateEvent(data.id, data);
              } else {
                handleCreateEvent(data);
              }
            }}
            onDelete={handleDeleteEvent}
            onClose={() => setShowEventModal({})}
          />
        ) : null}

        <ChatWidget />
      </div>
    </ToastContainer>
  );
}

export default App;