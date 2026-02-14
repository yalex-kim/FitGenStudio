import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { AuthState, User } from "@/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useAssetStore } from "./assetStore";
import { useGalleryStore } from "./galleryStore";

function mapSupabaseUser(su: SupabaseUser): User {
  return {
    id: su.id,
    email: su.email ?? "",
    name:
      su.user_metadata?.full_name ??
      su.user_metadata?.name ??
      su.email?.split("@")[0] ??
      "User",
    avatar: su.user_metadata?.avatar_url,
    tier: "free",
    creditsRemaining: 10,
    creditsTotal: 10,
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        set({
          user: mapSupabaseUser(session.user),
          isAuthenticated: true,
          isLoading: false,
        });
        useAssetStore.getState().initialize();
        useGalleryStore.getState().initialize();
      } else {
        set({ isLoading: false });
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          set({
            user: mapSupabaseUser(session.user),
            isAuthenticated: true,
            isLoading: false,
          });
          useAssetStore.getState().initialize();
          useGalleryStore.getState().initialize();
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      });
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ isLoading: false, error: error.message });
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: import.meta.env.VITE_SITE_URL
          ? `${import.meta.env.VITE_SITE_URL}/`
          : `${window.location.origin}/`,
      },
    });
    if (error) {
      set({ isLoading: false, error: error.message });
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });
    if (error) {
      set({ isLoading: false, error: error.message });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },
}));
