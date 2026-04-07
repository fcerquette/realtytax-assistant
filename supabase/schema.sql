-- RealtyTax Assistant - Supabase Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)

CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT DEFAULT 'default-user',
  original_text TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  deductible TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries by user
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_created_at ON expenses(created_at DESC);

-- Enable Row Level Security (prepared for future auth)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Temporary policy: allow all operations (replace with auth later)
CREATE POLICY "Allow all for now" ON expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Future: receipts table structure (not active yet)
-- CREATE TABLE IF NOT EXISTS receipts (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
--   file_url TEXT NOT NULL,
--   file_name TEXT,
--   uploaded_at TIMESTAMPTZ DEFAULT NOW()
-- );
