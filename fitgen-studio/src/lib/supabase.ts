import { createClient } from '@supabase/supabase-js';
import type {
  UserRow,
  UsageLogRow,
  UsageLogInsert,
} from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Database features will be unavailable.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
);

// Tier-based usage limits (images per month)
const TIER_LIMITS: Record<string, number> = {
  free: 10,
  pro: 500,
  business: Infinity,
};

export async function getCurrentUsage(userId: string): Promise<{ used: number; limit: number; remaining: number }> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [usageResult, userResult] = await Promise.all([
    supabase
      .from('usage_logs')
      .select('credits_used')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth),
    supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single(),
  ]);

  const user = userResult.data as Pick<UserRow, 'tier'> | null;
  const logs = usageResult.data as Pick<UsageLogRow, 'credits_used'>[] | null;

  const tier = user?.tier || 'free';
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  const used = logs?.reduce((sum, row) => sum + row.credits_used, 0) ?? 0;

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export async function logUsage(
  userId: string,
  action: UsageLogInsert['action'],
  metadata?: Record<string, unknown>,
) {
  const { error } = await supabase.from('usage_logs').insert({
    user_id: userId,
    action,
    credits_used: 1,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error('Failed to log usage:', error);
  }
}

export async function checkUsageLimit(userId: string): Promise<boolean> {
  const { remaining } = await getCurrentUsage(userId);
  return remaining > 0;
}
