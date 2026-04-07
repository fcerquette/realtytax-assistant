import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import expensesRouter from './routes/expenses.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', expensesRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend static files in production
const distPath = join(__dirname, '..', 'frontend', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
  console.log('Serving frontend from', distPath);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
