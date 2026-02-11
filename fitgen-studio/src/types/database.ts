// Supabase database types for FitGen Studio

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      models: {
        Row: ModelRow;
        Insert: ModelInsert;
        Update: ModelUpdate;
      };
      garments: {
        Row: GarmentRow;
        Insert: GarmentInsert;
        Update: GarmentUpdate;
      };
      generations: {
        Row: GenerationRow;
        Insert: GenerationInsert;
        Update: GenerationUpdate;
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      usage_logs: {
        Row: UsageLogRow;
        Insert: UsageLogInsert;
        Update: never;
      };
    };
  };
}

// --- Users ---
export interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  tier: 'free' | 'pro' | 'business';
  created_at: string;
  updated_at: string;
}

export type UserInsert = Omit<UserRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type UserUpdate = Partial<Omit<UserRow, 'id' | 'created_at'>>;

// --- Models ---
export interface ModelRow {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  thumbnail_url: string | null;
  gender: 'female' | 'male';
  body_type: 'slim' | 'athletic' | 'plus-size';
  age_range: '20s' | '30s' | '40s';
  style_preset: 'lovely' | 'chic' | 'sporty' | 'street' | null;
  prompt_used: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ModelInsert = Omit<ModelRow, 'id' | 'created_at' | 'updated_at' | 'metadata'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
};

export type ModelUpdate = Partial<Omit<ModelRow, 'id' | 'user_id' | 'created_at'>>;

// --- Garments ---
export interface GarmentRow {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  thumbnail_url: string | null;
  category: 'tops' | 'outerwear' | 'bottoms' | 'dresses' | 'accessories';
  metadata: Record<string, unknown>;
  created_at: string;
}

export type GarmentInsert = Omit<GarmentRow, 'id' | 'created_at' | 'metadata'> & {
  id?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
};

export type GarmentUpdate = Partial<Omit<GarmentRow, 'id' | 'user_id' | 'created_at'>>;

// --- Generations ---
export interface GenerationRow {
  id: string;
  user_id: string;
  project_id: string | null;
  model_id: string | null;
  garment_id: string | null;
  type: 'model' | 'swap' | 'variation' | 'upscale';
  image_url: string;
  thumbnail_url: string | null;
  prompt_used: string | null;
  generation_params: Record<string, unknown>;
  gemini_model_version: string | null;
  created_at: string;
}

export type GenerationInsert = Omit<GenerationRow, 'id' | 'created_at' | 'generation_params'> & {
  id?: string;
  created_at?: string;
  generation_params?: Record<string, unknown>;
};

export type GenerationUpdate = Partial<Omit<GenerationRow, 'id' | 'user_id' | 'created_at'>>;

// --- Projects ---
export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectInsert = Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProjectUpdate = Partial<Omit<ProjectRow, 'id' | 'user_id' | 'created_at'>>;

// --- Usage Logs ---
export interface UsageLogRow {
  id: string;
  user_id: string;
  action: 'model_generation' | 'clothing_swap' | 'variation' | 'upscale' | 'upload';
  credits_used: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type UsageLogInsert = Omit<UsageLogRow, 'id' | 'created_at' | 'metadata'> & {
  id?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
};
