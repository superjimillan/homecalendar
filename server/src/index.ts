import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '../../.env');
dotenv.config({ path: envPath, override: true });

const keySource = process.env.OPENAI_API_KEY ? (process.env.OPENAI_API_KEY.startsWith('sk-proj-Mc') ? 'shell env (WRONG KEY)' : '.env file') : 'NOT SET';
console.log(`[ENV] OPENAI_API_KEY source: ${keySource}`);

import express from 'express';
import cors from 'cors';
import { initializeDatabase, closeDatabase } from './db/database.js';
import eventsRouter from './routes/events.js';
import gmailRouter from './routes/gmail.js';
import chatRouter from './routes/chat.js';

const clientDist = resolve(__dirname, '../../client/dist');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/events', eventsRouter);
app.use('/api/gmail', gmailRouter);
app.use('/api/chat', chatRouter);

app.use(express.static(clientDist));

app.get('*', (req, res) => {
  res.sendFile(resolve(clientDist, 'index.html'));
});

import { isAuthenticated, syncEmails } from './services/gmail.js';

initializeDatabase();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Env file: ${envPath}`);
  console.log(`OPENAI_API_KEY set: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
  console.log(`GMAIL_CLIENT_ID set: ${!!process.env.GMAIL_CLIENT_ID}`);
});

// Auto-sync Gmail every hour
setInterval(async () => {
  try {
    const auth = await isAuthenticated();
    if (auth) {
      console.log('[AutoSync] Starting hourly Gmail sync...');
      const result = await syncEmails();
      console.log(`[AutoSync] Processed ${result.processed} messages, found ${result.suggestions} suggestions`);
    }
  } catch (err: any) {
    console.error('[AutoSync] Failed:', err.message);
  }
}, 60 * 60 * 1000);

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    closeDatabase();
    process.exit(0);
  });
});