import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getRemainingCredits, getMonthlyLimit, hasCreditsRemaining, type Tier } from "@/lib/usageLimits";

export interface UsageState {
  /** Number of generations used in the current billing month */
  usedThisMonth: number;
  /** ISO date string of the current billing month start (YYYY-MM) */
  currentMonth: string;

  /** Record a generation usage (increments count by 1) */
  recordUsage: () => void;
  /** Reset usage for a new month */
  resetIfNewMonth: () => void;

  /** Check whether the user can generate (given their tier) */
  canGenerate: (tier: Tier) => boolean;
  /** Get remaining credits for a tier */
  getRemaining: (tier: Tier) => number;
  /** Get the monthly limit for a tier */
  getLimit: (tier: Tier) => number;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      usedThisMonth: 0,
      currentMonth: getCurrentMonth(),

      recordUsage: () => {
        const state = get();
        const month = getCurrentMonth();
        if (state.currentMonth !== month) {
          set({ usedThisMonth: 1, currentMonth: month });
        } else {
          set({ usedThisMonth: state.usedThisMonth + 1 });
        }
      },

      resetIfNewMonth: () => {
        const state = get();
        const month = getCurrentMonth();
        if (state.currentMonth !== month) {
          set({ usedThisMonth: 0, currentMonth: month });
        }
      },

      canGenerate: (tier: Tier) => {
        const state = get();
        return hasCreditsRemaining(tier, state.usedThisMonth);
      },

      getRemaining: (tier: Tier) => {
        const state = get();
        return getRemainingCredits(tier, state.usedThisMonth);
      },

      getLimit: (tier: Tier) => {
        return getMonthlyLimit(tier);
      },
    }),
    {
      name: "fitgen-usage",
      partialize: (state) => ({
        usedThisMonth: state.usedThisMonth,
        currentMonth: state.currentMonth,
      }),
    }
  )
);
