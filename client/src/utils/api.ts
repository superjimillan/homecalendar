const API_BASE = '/api';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
      if (body.detail) message = body.detail;
    } catch {
      try {
        message = await response.text() || message;
      } catch {}
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  events: {
    list: (start: Date, end: Date) =>
      fetchJson<{ events: any[] }>(`/events?start=${start.toISOString()}&end=${end.toISOString()}`),

    create: (event: any) =>
      fetchJson<any>('/events', {
        method: 'POST',
        body: JSON.stringify(event),
      }),

    update: (id: string, event: any) =>
      fetchJson<any>(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(event),
      }),

    delete: (id: string) =>
      fetchJson<void>(`/events/${id}`, {
        method: 'DELETE',
      }),

    fromGmail: (event: any) =>
      fetchJson<any>('/events/from-gmail', {
        method: 'POST',
        body: JSON.stringify(event),
      }),
  },

  gmail: {
    authUrl: () =>
      fetchJson<{ url: string }>('/gmail/auth-url'),

    status: () =>
      fetchJson<{ authenticated: boolean }>('/gmail/status'),

    sync: () =>
      fetchJson<{ processed: number; suggestions: number }>('/gmail/sync', {
        method: 'POST',
      }),

    suggestions: () =>
      fetchJson<{ suggestions: any[] }>('/gmail/suggestions'),

    acceptSuggestion: (id: string, creator: 'victor' | 'sandra') =>
      fetchJson<{ event: any; suggestion: any }>(`/gmail/suggestions/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify({ creator }),
      }),

    rejectSuggestion: (id: string) =>
      fetchJson<void>(`/gmail/suggestions/${id}/reject`, {
        method: 'POST',
      }),
  },

  chat: {
    send: (message: string, history: any[]) =>
      fetchJson<{ message: any; events?: any[] }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history }),
      }),
  },
};