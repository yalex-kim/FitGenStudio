import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState, User } from "@/types";

const MOCK_USER: User = {
  id: "1",
  email: "user@fitgen.studio",
  name: "Demo User",
  avatar: undefined,
  tier: "pro",
  creditsRemaining: 487,
  creditsTotal: 500,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (_email: string, _password: string) => {
        set({ isLoading: true });
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));
        set({ user: MOCK_USER, isAuthenticated: true, isLoading: false });
      },

      register: async (name: string, email: string, _password: string) => {
        set({ isLoading: true });
        await new Promise((resolve) => setTimeout(resolve, 800));
        set({
          user: { ...MOCK_USER, name, email },
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },
    }),
    {
      name: "fitgen-auth",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
