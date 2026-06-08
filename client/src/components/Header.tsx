import { forwardRef } from 'react';
import type { ViewMode, User, GmailSuggestion } from '../types';
import type { GmailSyncStatus } from '../types';

interface HeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  selectedUser: User;
  onUserChange: (user: User) => void;
  gmailStatus: GmailSyncStatus;
  onConnectGmail: () => void;
  onSyncGmail: () => void;
  showGmailSuggestions: boolean;
  onToggleGmailSuggestions: (show: boolean) => void;
  gmailSuggestions: GmailSuggestion[];
  onAcceptSuggestion: (suggestion: GmailSuggestion, creator: User) => void;
  onRejectSuggestion: (id: string) => void;
  dateHeader: string;
}

export const Header = forwardRef<HTMLDivElement, HeaderProps>(
  (
    {
      viewMode,
      onViewModeChange,
      onNavigate,
      onToday,
      selectedUser,
      onUserChange,
      gmailStatus,
      onConnectGmail,
      onSyncGmail,
      showGmailSuggestions,
      onToggleGmailSuggestions,
      gmailSuggestions,
      onAcceptSuggestion,
      onRejectSuggestion,
      dateHeader,
    },
    ref
  ) => {
    const views: ViewMode[] = ['day', 'week', 'month'];

    if (showGmailSuggestions && gmailSuggestions.length > 0) {
      return (
        <div className="fixed inset-0 z-50 bg-gray-900/80 flex items-end sm:items-center justify-center p-4 safe-top safe-bottom animate-fade-in" role="dialog" aria-modal="true">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">
            <div className="bottom-sheet-handle" />
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Event Suggestions</h2>
              <button
                onClick={() => onToggleGmailSuggestions(false)}
                className="p-2 rounded-xl hover:bg-gray-100 touch-target"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {gmailSuggestions.map(suggestion => (
                <div key={suggestion.id} className="border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50">
                  <div className="mb-3">
                    <p className="font-bold text-gray-900 text-sm">{suggestion.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{suggestion.from}</p>
                  </div>
                  <div className="mb-4 text-sm text-gray-700 bg-white rounded-xl p-3 border border-gray-100">
                    <p className="font-semibold text-gray-900">{suggestion.suggestedEvent.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {suggestion.suggestedEvent.start ? new Date(suggestion.suggestedEvent.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                      {suggestion.suggestedEvent.allDay ? ' · All day' : suggestion.suggestedEvent.start ? ` · ${new Date(suggestion.suggestedEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-victor-500 h-1.5 rounded-full" style={{ width: `${Math.round(suggestion.confidence * 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">{Math.round(suggestion.confidence * 100)}%</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onAcceptSuggestion(suggestion, 'victor')}
                      className="btn btn-primary text-sm py-2.5"
                    >
                      Add for Victor
                    </button>
                    <button
                      onClick={() => onAcceptSuggestion(suggestion, 'sandra')}
                      className="btn text-sm py-2.5 bg-sandra-500 text-white hover:bg-sandra-600 shadow-lg shadow-sandra-500/25"
                    >
                      Add for Sandra
                    </button>
                  </div>
                  <button
                    onClick={() => onRejectSuggestion(suggestion.id)}
                    className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 font-medium py-2"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <header ref={ref} className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 safe-top shadow-sm">
        <div className="px-3 py-2">
          {/* Top row: Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onNavigate('prev')}
                className="p-2.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 touch-target transition-colors"
                aria-label="Previous"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={onToday}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-colors"
              >
                TODAY
              </button>
              <button
                onClick={() => onNavigate('next')}
                className="p-2.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 touch-target transition-colors"
                aria-label="Next"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <h1 className="text-base font-bold text-gray-900 text-center flex-1 truncate px-2">
              {dateHeader}
            </h1>

            <div className="flex items-center gap-1">
              {gmailStatus.pendingSuggestions > 0 && (
                <button
                  onClick={() => onToggleGmailSuggestions(true)}
                  className="relative p-2.5 rounded-xl bg-victor-50 text-victor-600 hover:bg-victor-100 touch-target transition-colors"
                  aria-label="Gmail suggestions"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {gmailStatus.pendingSuggestions}
                  </span>
                </button>
              )}
              {!gmailStatus.authenticated ? (
                <button
                  onClick={onConnectGmail}
                  className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 touch-target transition-colors"
                  aria-label="Connect Gmail"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </button>
              ) : (
                <button
                  onClick={onSyncGmail}
                  className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 touch-target transition-colors"
                  aria-label="Sync Gmail"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Second row: User selector only */}
          <div className="flex items-center justify-end mt-2 gap-2">
            <div className="flex gap-1" role="group">
              {(['victor', 'sandra'] as User[]).map(user => (
                <button
                  key={user}
                  onClick={() => onUserChange(user)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold touch-target transition-all ${
                    selectedUser === user
                      ? user === 'victor'
                        ? 'bg-victor-100 text-victor-700 ring-2 ring-victor-500/30'
                        : 'bg-sandra-100 text-sandra-700 ring-2 ring-sandra-500/30'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  aria-pressed={selectedUser === user}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    user === 'victor' ? 'bg-victor-500' : 'bg-sandra-500'
                  }`}>
                    {user === 'victor' ? 'V' : 'S'}
                  </span>
                  <span className="hidden sm:inline">{user === 'victor' ? 'Victor' : 'Sandra'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';