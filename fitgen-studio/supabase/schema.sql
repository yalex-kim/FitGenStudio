-- FitGen Studio Database Schema
-- Supabase PostgreSQL

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users table (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'business')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Models (My Models library)
-- ============================================
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Model',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('female', 'male')),
  body_type TEXT NOT NULL CHECK (body_type IN ('slim', 'athletic', 'plus-size')),
  age_range TEXT NOT NULL CHECK (age_range IN ('20s', '30s', '40s')),
  style_preset TEXT CHECK (style_preset IN ('lovely', 'chic', 'sporty', 'street')),
  prompt_used TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_models_user_id ON public.models(user_id);

-- ============================================
-- Garments (uploaded garment images)
-- ============================================
CREATE TABLE public.garments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Garment',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('tops', 'outerwear', 'bottoms', 'dresses', 'accessories')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_garments_user_id ON public.garments(user_id);

-- ============================================
-- Generations (generated lookbook images)
-- ============================================
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  garment_id UUID REFERENCES public.garments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('model', 'swap', 'variation', 'upscale')),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt_used TEXT,
  generation_params JSONB DEFAULT '{}',
  gemini_model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generations_user_id ON public.generations(user_id);
CREATE INDEX idx_generations_project_id ON public.generations(project_id);
CREATE INDEX idx_generations_created_at ON public.generations(created_at DESC);

-- ============================================
-- Projects (group generations together)
-- ============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON public.projects(user_id);

-- ============================================
-- Usage Logs (track API usage per user)
-- ============================================
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('model_generation', 'clothing_swap', 'variation', 'upscale', 'upload')),
  credits_used INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at);
CREATE INDEX idx_usage_logs_user_month ON public.usage_logs(user_id, created_at);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Models: CRUD on own models only
CREATE POLICY "Users can view own models"
  ON public.models FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own models"
  ON public.models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own models"
  ON public.models FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own models"
  ON public.models FOR DELETE
  USING (auth.uid() = user_id);

-- Garments: CRUD on own garments only
CREATE POLICY "Users can view own garments"
  ON public.garments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own garments"
  ON public.garments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own garments"
  ON public.garments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own garments"
  ON public.garments FOR DELETE
  USING (auth.uid() = user_id);

-- Generations: CRUD on own generations only
CREATE POLICY "Users can view own generations"
  ON public.generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
  ON public.generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations"
  ON public.generations FOR DELETE
  USING (auth.uid() = user_id);

-- Projects: CRUD on own projects only
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Usage Logs: users can view own logs, insert handled by service role
CREATE POLICY "Users can view own usage"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER models_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
