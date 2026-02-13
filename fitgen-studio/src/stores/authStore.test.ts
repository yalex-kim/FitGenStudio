import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';

vi.mock('./galleryStore', () => ({
  useGalleryStore: { getState: vi.fn().mockReturnValue({ initialize: vi.fn() }) },
}));

// Mock Supabase auth methods
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: '1',
            email: 'user@test.com',
            user_metadata: { full_name: 'Test User', avatar_url: null },
          },
          session: {},
        },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: '2',
            email: 'new@test.com',
            user_metadata: { full_name: 'New User', avatar_url: null },
          },
          session: {},
        },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should have correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set isLoading during login', async () => {
    const { login } = useAuthStore.getState();
    const promise = login('user@test.com', 'password');
    expect(useAuthStore.getState().isLoading).toBe(true);
    await promise;
  });

  it('should logout and clear user', async () => {
    // Set authenticated state first
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'user@test.com',
        name: 'Test',
        tier: 'free',
        creditsRemaining: 10,
        creditsTotal: 10,
      },
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should setUser directly', () => {
    const { setUser } = useAuthStore.getState();
    const mockUser = {
      id: '42',
      email: 'direct@test.com',
      name: 'Direct User',
      tier: 'business' as const,
      creditsRemaining: 999,
      creditsTotal: 999,
    };

    setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should handle login error', async () => {
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials', name: 'AuthError', status: 400 },
    } as never);

    await useAuthStore.getState().login('bad@test.com', 'wrong');

    const state = useAuthStore.getState();
    expect(state.error).toBe('Invalid credentials');
    expect(state.isLoading).toBe(false);
  });
});
