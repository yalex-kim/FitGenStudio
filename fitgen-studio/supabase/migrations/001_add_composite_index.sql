-- Fix statement timeout on generations query
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Composite index for: WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
CREATE INDEX IF NOT EXISTS idx_generations_user_created
  ON public.generations(user_id, created_at DESC);
