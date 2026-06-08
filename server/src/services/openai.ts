import OpenAI from 'openai';
import { CreateEventInput, User } from '../types.js';

let _openai: OpenAI | null = null;

function getOpenAI() {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY;
    console.log(`[OpenAI] Creating client, key present: ${!!key}, prefix: ${key?.slice(0, 7)}...`);
    _openai = new OpenAI({
      apiKey: key,
    });
  }
  return _openai;
}

const FALLBACK_MODELS = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];

function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
}

const EMAIL_PARSING_PROMPT = `You are an assistant that extracts calendar events from emails.
Given an email subject, body, and sender, identify any events mentioned.
Return a JSON array of events found. Each event should have:
- title: string (required)
- description: string (optional)
- start: ISO datetime string (required)
- end: ISO datetime string (required)
- allDay: boolean (required)
- creator: "victor" or "sandra" (required - infer from context, default to "victor")
- confidence: number 0-1 (how confident you are this is a real event)

Only extract events that have clear dates/times. Ignore promotional emails, newsletters, etc.
If no events found, return empty array.
Current date: {{CURRENT_DATE}}`;

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parseEmailForEvents(
  subject: string,
  body: string,
  from: string
): Promise<Array<{ suggestedEvent: Partial<CreateEventInput>; confidence: number }>> {
  const currentDate = new Date().toISOString().split('T')[0];
  const prompt = EMAIL_PARSING_PROMPT.replace('{{CURRENT_DATE}}', currentDate);

  const cleanBody = body.includes('<') && body.includes('>') ? stripHtml(body) : body;

  try {
    const key = process.env.OPENAI_API_KEY || '';
    const model = getModel();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Subject: ${subject}\nFrom: ${from}\nBody: ${cleanBody.slice(0, 5000)}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err: any = await response.json().catch(() => ({ error: { message: response.statusText } }));
      console.error('[OpenAI] Email parse failed:', err.error?.message || response.statusText);
      return [];
    }

    const completion: any = await response.json();
    const result = JSON.parse(completion.choices[0].message.content || '{"events": []}');
    const events = result.events || [];
    return events.map((e: any) => ({
      suggestedEvent: e.suggestedEvent || e,
      confidence: e.confidence ?? 0.8,
    }));
  } catch (error) {
    console.error('OpenAI email parsing error:', error);
    return [];
  }
}

const CHAT_SYSTEM_PROMPT = `You are a helpful calendar assistant for Victor and Sandra.
You have access to their shared calendar. You can:
1. Answer questions about upcoming events
2. Create new events
3. Modify existing events
4. Delete events

Current date: {{CURRENT_DATE}}
Users: Victor (blue), Sandra (pink)

When creating events, ask for clarification if needed (date, time, duration, who it's for).
When answering questions, be concise and reference specific events.`;

const CHAT_FUNCTIONS = [
  {
    name: 'get_events',
    description: 'Get events in a date range',
    parameters: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start date ISO string' },
        end: { type: 'string', description: 'End date ISO string' },
      },
      required: ['start', 'end'],
    },
  },
  {
    name: 'create_event',
    description: 'Create a new calendar event',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        start: { type: 'string', description: 'ISO datetime' },
        end: { type: 'string', description: 'ISO datetime' },
        allDay: { type: 'boolean' },
        creator: { type: 'string', enum: ['victor', 'sandra'] },
      },
      required: ['title', 'start', 'end', 'allDay', 'creator'],
    },
  },
  {
    name: 'update_event',
    description: 'Update an existing event',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        start: { type: 'string' },
        end: { type: 'string' },
        allDay: { type: 'boolean' },
        creator: { type: 'string', enum: ['victor', 'sandra'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_event',
    description: 'Delete an event',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
  },
];

export async function* streamChat(
  message: string,
  history: Array<{ role: string; content: string }>
): AsyncGenerator<{ text?: string; error?: string }> {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const systemPrompt = CHAT_SYSTEM_PROMPT.replace('{{CURRENT_DATE}}', currentDate);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const key = process.env.OPENAI_API_KEY || '';
    const model = getModel();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err: any = await response.json().catch(() => ({ error: { message: response.statusText } }));
      yield { error: err.error?.message || `HTTP ${response.status}` };
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield { text: delta };
          }
        } catch {
          // ignore malformed JSON
        }
      }
    }
  } catch (error: any) {
    yield { error: error.message || 'AI assistant unavailable.' };
  }
}