import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'expenses.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default-user',
    original_text TEXT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    deductible TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

export function getAllExpenses(userId = 'default-user') {
  return db.prepare(
    'SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}

export function insertExpense({ original_text, name, amount, category, deductible, note }) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO expenses (id, user_id, original_text, name, amount, category, deductible, note)
    VALUES (?, 'default-user', ?, ?, ?, ?, ?, ?)
  `).run(id, original_text, name, amount, category, deductible, note);

  return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
}

export function deleteExpense(id) {
  return db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
}
