import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('should have correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('should login and set user', async () => {
    const { login } = useAuthStore.getState();
    await login('user@test.com', 'password');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).not.toBeNull();
    expect(state.user!.email).toBe('user@fitgen.studio');
    expect(state.user!.tier).toBe('pro');
    expect(state.isLoading).toBe(false);
  });

  it('should set isLoading during login', async () => {
    const { login } = useAuthStore.getState();
    const promise = login('user@test.com', 'password');

    // isLoading should be true during the async operation
    expect(useAuthStore.getState().isLoading).toBe(true);

    await promise;
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('should register and set user with provided name and email', async () => {
    const { register } = useAuthStore.getState();
    await register('Test User', 'test@example.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user!.name).toBe('Test User');
    expect(state.user!.email).toBe('test@example.com');
    expect(state.isLoading).toBe(false);
  });

  it('should logout and clear user', async () => {
    const { login, logout } = useAuthStore.getState();
    await login('user@test.com', 'password');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    logout();

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
});
