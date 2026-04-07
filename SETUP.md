# RealtyTax Assistant - Setup Instructions

## Prerequisites
- Node.js 18+
- Ollama installed (https://ollama.com) - FREE, runs locally
- A Supabase account (free tier: https://supabase.com)

---

## 1. Ollama Setup (AI - 100% Free)

1. Download and install Ollama from https://ollama.com
2. Pull a model (recommended: llama3.1):

```bash
ollama pull llama3.1
```

3. Make sure Ollama is running (it starts automatically after install)
4. Test it: `ollama list` should show your model

**Other good models for this task:**
- `llama3.1` (8B) - best balance of speed and quality
- `mistral` (7B) - fast and good with structured output
- `llama3.1:70b` - better quality, needs more RAM (40GB+)

---

## 2. Supabase Setup (Database - Free)

1. Go to https://supabase.com and create a new project
2. Once created, go to **SQL Editor**
3. Paste the contents of `supabase/schema.sql` and click **Run**
4. Go to **Settings > API** and copy:
   - Project URL (e.g. `https://xxxxx.supabase.co`)
   - `anon` public key

---

## 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your Supabase keys:
```
PORT=3001
OLLAMA_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3.1
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Start the server:
```bash
npm run dev
```

---

## 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## How it works

1. Type an expense like "dinner with client 80"
2. Ollama (local AI) analyzes and categorizes it (IRS categories)
3. It gets saved to your Supabase database
4. View summary totals by deductibility
5. Click "Export for Accountant" to generate a text report

---

## Cost: $0

| Service | Cost |
|---------|------|
| Ollama (AI) | Free - runs on your machine |
| Supabase (DB) | Free tier: 500MB, 50K rows |
| Vite dev server | Free |

---

## Switching to OpenAI later (optional)

If you want to use OpenAI instead, just change your `.env`:
```
OLLAMA_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-3.5-turbo
```
And update the OpenAI client in `routes/expenses.js` to use a real API key.

---

## Project Structure

```
realtytax-assistant/
├── backend/
│   ├── server.js          # Express entry point
│   ├── routes/expenses.js # API routes + Ollama AI
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.vue
│   │   ├── style.css
│   │   └── components/
│   │       ├── ExpenseInput.vue
│   │       ├── ExpenseTable.vue
│   │       ├── ExpenseSummary.vue
│   │       └── ExportModal.vue
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── supabase/
    └── schema.sql
```
