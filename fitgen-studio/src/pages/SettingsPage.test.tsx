import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { SettingsPage } from './SettingsPage';
import { useAuthStore } from '@/stores/authStore';

describe('SettingsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'free',
        creditsRemaining: 10,
        creditsTotal: 10,
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  it('should render settings heading', () => {
    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render profile section with user info', () => {
    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('should render subscription section', () => {
    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Subscription')).toBeInTheDocument();
  });

  it('should render usage section', () => {
    renderWithRouter(<SettingsPage />);
    expect(screen.getByText('Usage')).toBeInTheDocument();
  });
});
