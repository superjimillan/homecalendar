import { initializeDatabase } from './database.js';

console.log('Running database migrations...');
initializeDatabase();
console.log('Migrations completed successfully!');