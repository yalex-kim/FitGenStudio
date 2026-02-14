// Usage limits by tier
export const TIER_LIMITS = {
  free: 10,
  pro: 500,
  business: Infinity,
} as const;

export type Tier = keyof typeof TIER_LIMITS;

export function getMonthlyLimit(tier: Tier): number {
  return TIER_LIMITS[tier];
}

export function hasCreditsRemaining(tier: Tier, usedThisMonth: number): boolean {
  // TODO: Remove bypass when done testing
  if (import.meta.env.VITE_BYPASS_CREDITS === "true") return true;
  const limit = TIER_LIMITS[tier];
  return usedThisMonth < limit;
}

export function getRemainingCredits(tier: Tier, usedThisMonth: number): number {
  const limit = TIER_LIMITS[tier];
  if (limit === Infinity) return Infinity;
  return Math.max(0, limit - usedThisMonth);
}
