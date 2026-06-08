export type User = 'victor' | 'sandra';
export type ViewMode = 'day' | 'week' | 'month';

export interface Event {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  creator: User;
  color: string;
  createdAt: string;
  updatedAt: string;
  source?: 'manual' | 'gmail' | 'ai';
  gmailMessageId?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay: boolean;
  creator: User;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  creator?: User;
  source?: 'manual' | 'gmail' | 'ai';
}

export interface GmailSuggestion {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  receivedAt: string;
  suggestedEvent: Partial<CreateEventInput>;
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  eventIds?: string[];
}

export interface CalendarState {
  currentDate: Date;
  viewMode: ViewMode;
  selectedUser: User;
  events: Event[];
  isLoading: boolean;
}

export interface EventFormData extends CreateEventInput {
  id?: string;
}

export interface GmailSyncStatus {
  authenticated: boolean;
  lastSync?: string;
  pendingSuggestions: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
}

export const USER_COLORS: Record<User, string> = {
  victor: '#3B82F6',
  sandra: '#EC4899',
};

export const USER_NAMES: Record<User, string> = {
  victor: 'Victor',
  sandra: 'Sandra',
};

export const USER_AVATARS: Record<User, string> = {
  victor: 'V',
  sandra: 'S',
};