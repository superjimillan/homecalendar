import { google, gmail_v1 } from 'googleapis';
import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { GmailSuggestion } from '../types.js';
import { parseEmailForEvents } from './openai.js';

let _oauth2Client: any = null;

function getOAuth2Client() {
  if (!_oauth2Client) {
    _oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
  }
  return _oauth2Client;
}

const TARGET_DOMAIN = process.env.GMAIL_TARGET_DOMAIN || 'belmayne-etns.ie';

const selectTokens = db.prepare('SELECT * FROM gmail_tokens WHERE id = 1');
const upsertTokens = db.prepare(`
  INSERT INTO gmail_tokens (id, access_token, refresh_token, expiry_date, updated_at)
  VALUES (1, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    access_token = excluded.access_token,
    refresh_token = excluded.refresh_token,
    expiry_date = excluded.expiry_date,
    updated_at = excluded.updated_at
`);

const insertSuggestion = db.prepare(`
  INSERT INTO gmail_suggestions (id, message_id, subject, from_email, received_at, suggested_event, confidence, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const selectSuggestionByMessageId = db.prepare('SELECT id FROM gmail_suggestions WHERE message_id = ?');
const selectSuggestions = db.prepare('SELECT * FROM gmail_suggestions WHERE status = ? ORDER BY created_at DESC');
const selectSuggestionById = db.prepare('SELECT * FROM gmail_suggestions WHERE id = ?');
const updateSuggestionStatus = db.prepare('UPDATE gmail_suggestions SET status = ? WHERE id = ?');

export function getAuthUrl(): string {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
  ];
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
}

export async function handleCallback(code: string): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  await saveTokens(tokens);
}

async function saveTokens(tokens: any): Promise<void> {
  const now = new Date().toISOString();
  upsertTokens.run(
    tokens.access_token,
    tokens.refresh_token,
    tokens.expiry_date,
    now
  );
}

async function loadTokens(): Promise<boolean> {
  const row = selectTokens.get() as any;
  if (!row?.access_token) return false;

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.expiry_date,
  });

  if (row.expiry_date && Date.now() >= row.expiry_date) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await saveTokens(credentials);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return false;
    }
  }

  return true;
}

export async function isAuthenticated(): Promise<boolean> {
  return await loadTokens();
}

async function getGmailClient(): Promise<gmail_v1.Gmail | null> {
  const authenticated = await loadTokens();
  if (!authenticated) return null;
  return google.gmail({ version: 'v1', auth: getOAuth2Client() });
}

export async function syncEmails(): Promise<{ processed: number; suggestions: number }> {
  const gmail = await getGmailClient();
  if (!gmail) throw new Error('Gmail not authenticated');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const afterTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);

  // Try broad search first (no from filter) to verify API works
  const broadQuery = `after:${afterTimestamp}`;
  console.log(`[Gmail] Broad search: ${broadQuery}`);
  const broadResponse = await gmail.users.messages.list({
    userId: 'me',
    q: broadQuery,
    maxResults: 10,
  });
  console.log(`[Gmail] Broad search found: ${(broadResponse.data.messages || []).length} messages`);

  // Now try specific search
  const specificQuery = `from:${TARGET_DOMAIN} after:${afterTimestamp}`;
  console.log(`[Gmail] Specific search: ${specificQuery}`);
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: specificQuery,
    maxResults: 50,
  });

  let messages = response.data.messages || [];
  console.log(`[Gmail] Specific search found: ${messages.length} messages`);

  // If specific search returns 0 but broad found some, search all and filter manually
  if (messages.length === 0 && (broadResponse.data.messages || []).length > 0) {
    console.log(`[Gmail] Specific search returned 0. Searching all mail and filtering manually...`);
    const allResponse = await gmail.users.messages.list({
      userId: 'me',
      q: `after:${afterTimestamp}`,
      maxResults: 50,
    });
    const allMessages = allResponse.data.messages || [];
    console.log(`[Gmail] Checking ${allMessages.length} messages for sender match...`);

    const matchedMessages = [];
    for (const msg of allMessages.slice(0, 20)) {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      });
      const from = detail.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
      const subject = detail.data.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      console.log(`[Gmail]   Checking: From="${from}" Subject="${subject}"`);
      if (from.toLowerCase().includes('@' + TARGET_DOMAIN.toLowerCase())) {
        matchedMessages.push(msg);
        console.log(`[Gmail]   -> MATCHED!`);
      }
    }
    messages = matchedMessages;
    console.log(`[Gmail] Manual filter matched: ${messages.length} messages`);
  }

  let suggestions = 0;

  for (const msg of messages.slice(0, 10)) {
    console.log(`[Gmail] Processing message ${msg.id}`);
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'full',
    });

    const headers = detail.data.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const dateHeader = headers.find(h => h.name === 'Date')?.value || '';
    const receivedAt = new Date(dateHeader).toISOString();

    console.log(`[Gmail]   Subject: "${subject}"`);
    console.log(`[Gmail]   From: ${from}`);

    const body = extractBody(detail.data.payload);
    if (!body) {
      console.log(`[Gmail]   No body extracted, skipping`);
      continue;
    }
    console.log(`[Gmail]   Body length: ${body.length} chars`);

    const events = await parseEmailForEvents(subject, body, from);
    console.log(`[Gmail]   OpenAI found ${events.length} events`);

    for (const event of events) {
      if (!event?.suggestedEvent?.title) {
        console.log(`[Gmail]   Skipping malformed event:`, JSON.stringify(event));
        continue;
      }
      console.log(`[Gmail]   Event: "${event.suggestedEvent.title}" confidence=${event.confidence}`);
      if (event.confidence > 0.6) {
        const existing = selectSuggestionByMessageId.get(msg.id!) as any;
        if (existing) {
          console.log(`[Gmail]   -> Already exists, skipping`);
          continue;
        }
        const id = uuidv4();
        const now = new Date().toISOString();
        insertSuggestion.run(
          id,
          msg.id!,
          subject,
          from,
          receivedAt,
          JSON.stringify(event.suggestedEvent),
          event.confidence,
          'pending',
          now
        );
        suggestions++;
        console.log(`[Gmail]   -> Saved suggestion ${id}`);
      }
    }
  }

  console.log(`[Gmail] Sync complete. Processed: ${messages.length}, Suggestions: ${suggestions}`);
  return { processed: messages.length, suggestions };
}

function extractBody(payload: gmail_v1.Schema$MessagePart | null | undefined): string | null {
  if (!payload) return null;

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const body = extractBody(part);
      if (body) return body;
    }
  }

  return null;
}

export function getPendingSuggestions(): GmailSuggestion[] {
  const rows = selectSuggestions.all('pending') as any[];
  return rows.map(row => ({
    id: row.id,
    messageId: row.message_id,
    subject: row.subject,
    from: row.from_email,
    receivedAt: row.received_at,
    suggestedEvent: JSON.parse(row.suggested_event),
    confidence: row.confidence,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export function acceptSuggestion(id: string, creator: 'victor' | 'sandra'): { event: any; suggestion: GmailSuggestion } | null {
  const row = selectSuggestionById.get(id) as any;
  if (!row || row.status !== 'pending') return null;

  updateSuggestionStatus.run('accepted', id);

  const suggestion: GmailSuggestion = {
    id: row.id,
    messageId: row.message_id,
    subject: row.subject,
    from: row.from_email,
    receivedAt: row.received_at,
    suggestedEvent: JSON.parse(row.suggested_event),
    confidence: row.confidence,
    status: 'accepted',
    createdAt: row.created_at,
  };

  return { suggestion, event: null };
}

export function rejectSuggestion(id: string): boolean {
  const result = updateSuggestionStatus.run('rejected', id);
  return result.changes > 0;
}