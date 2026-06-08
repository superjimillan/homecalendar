# HomeCalendar - Shared Family Calendar

## Project Overview
A mobile-first, shared calendar application for Victor and Sandra with Gmail integration for event extraction and an AI chatbot for calendar queries.

## Technical Stack
- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (better-sqlite3)
- **Styling**: Tailwind CSS
- **Calendar**: Custom implementation with date-fns
- **PWA**: Vite PWA plugin for offline support
- **Deployment**: Digital Ocean Apps (Docker)

## Core Features

### 1. Calendar Views
- **Day View**: Hourly timeline (6am-11pm), all-day events at top
- **Week View**: 7-column grid, hourly rows, all-day row at top
- **Month View**: Traditional calendar grid, event dots with colors
- **Navigation**: Swipe gestures, prev/next buttons, today button

### 2. Event Management (CRUD)
- Create/Read/Update/Delete events
- Fields: title, description, start/end datetime, all-day flag, creator (Victor/Sandra), color
- Multiple events per time slot (stacked)
- Drag to reschedule (future enhancement)

### 3. User Attribution
- Two users: Victor (blue theme) and Sandra (pink theme)
- Color-coded events by creator
- Quick creator selector when creating events
- No authentication - simple user switcher in header

### 4. Gmail Integration
- OAuth2 flow for Gmail API
- Monitor specific account: xxxx@belmayne-etns.ie
- Fetch emails from last 30 days
- Use OpenAI to parse emails for event information
- Present suggestions: "Found event: [title] on [date] at [time] - Add to calendar?"
- One-click accept/reject suggestions

### 5. AI Chatbot
- Floating chat button (bottom right)
- OpenAI integration with calendar context
- Capabilities:
  - "What do I have tomorrow?"
  - "When is my next meeting with Sandra?"
  - "Add dentist appointment for Friday 3pm"
  - "Show all events for next week"
  - Natural language event creation

### 6. Mobile-First UX
- Touch-friendly targets (44px minimum)
- Swipe navigation between views
- Pull-to-refresh
- Responsive breakpoints: <640px (mobile), 640-1024px (tablet), >1024px (desktop)
- PWA: Installable, offline-capable
- Safe area insets for notched devices

## Data Model

### Event
```typescript
interface Event {
  id: string;
  title: string;
  description?: string;
  start: Date;        // ISO string in DB
  end: Date;          // ISO string in DB
  allDay: boolean;
  creator: 'victor' | 'sandra';
  color: string;      // hex color per user
  createdAt: Date;
  updatedAt: Date;
  source?: 'manual' | 'gmail' | 'ai';
  gmailMessageId?: string;
}
```

### Gmail Suggestion
```typescript
interface GmailSuggestion {
  id: string;
  messageId: string;
  subject: string;
  from: string;
  receivedAt: Date;
  suggestedEvent: Partial<Event>;
  confidence: number;  // 0-1
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}
```

### Chat Message
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  eventIds?: string[];  // referenced events
}
```

## API Endpoints

### Events
- `GET /api/events?start=ISO&end=ISO` - Get events in range
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Gmail
- `GET /api/gmail/auth-url` - Get OAuth2 URL
- `GET /api/gmail/callback` - OAuth2 callback
- `POST /api/gmail/sync` - Fetch and parse new emails
- `GET /api/gmail/suggestions` - Get pending suggestions
- `POST /api/gmail/suggestions/:id/accept` - Accept suggestion
- `POST /api/gmail/suggestions/:id/reject` - Reject suggestion

### Chat
- `POST /api/chat` - Send message, get AI response

## Environment Variables
```
# Database
DATABASE_PATH=./data/calendar.db

# Gmail OAuth2
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=
GMAIL_TARGET_EMAIL=xxxx@belmayne-etns.ie

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-app.ondigitalocean.app
```

## Digital Ocean Apps Deployment
- Dockerfile for multi-stage build
- `.do/app.yaml` for App Platform spec
- SQLite persisted via DO managed volumes
- Environment variables configured in DO dashboard

## UI/UX Specifications

### Color Scheme
- Victor: Blue palette (#3B82F6 primary, #DBEAFE light)
- Sandra: Pink palette (#EC4899 primary, #FCE7F3 light)
- Background: #F9FAFB (light), #111827 (dark)
- Text: #1F2937 (light), #F3F4F6 (dark)

### Typography
- Font: Inter (system fallback)
- Headings: 600 weight
- Body: 400 weight
- Mobile base: 16px (prevents zoom on iOS)

### Components
- Header: Date, view switcher, user avatar, sync button
- Calendar grid: CSS Grid for month, Flex for week/day
- Event cards: Rounded, colored left border, truncate text
- Modal: Bottom sheet on mobile, centered on desktop
- Toast notifications for actions
- Floating action button (FAB) for create event
- Chat widget: Collapsible, message history

## Development Phases

### Phase 1: Core Calendar (Week 1)
- [ ] Project setup (Vite, React, Tailwind, Express)
- [ ] SQLite database with migrations
- [ ] Event CRUD API
- [ ] Day/Week/Month views
- [ ] Mobile navigation
- [ ] User switcher (Victor/Sandra)

### Phase 2: Gmail Integration (Week 2)
- [ ] Gmail OAuth2 flow
- [ ] Email fetching
- [ ] OpenAI email parsing
- [ ] Suggestion UI

### Phase 3: AI Chatbot (Week 3)
- [ ] Chat widget UI
- [ ] OpenAI function calling for calendar ops
- [ ] Context injection

### Phase 4: Polish & Deploy (Week 4)
- [ ] PWA configuration
- [ ] Docker setup
- [ ] DO Apps deployment
- [ ] Testing on mobile devices