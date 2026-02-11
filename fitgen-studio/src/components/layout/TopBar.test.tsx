import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { TopBar } from './TopBar';
import { useAuthStore } from '@/stores/authStore';
import { useUsageStore } from '@/stores/usageStore';

describe('TopBar', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        tier: 'pro',
        creditsRemaining: 450,
        creditsTotal: 500,
      },
      isAuthenticated: true,
      isLoading: false,
    });
    // TopBar now reads credits from usageStore: remaining = 500 - usedThisMonth
    // Set usedThisMonth to 50 so remaining shows as 450
    useUsageStore.setState({
      usedThisMonth: 50,
      currentMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    });
  });

  it('should display user credits', () => {
    renderWithRouter(<TopBar />);
    // TopBar displays credits as "remaining / limit" format
    expect(screen.getByText('450 / 500')).toBeInTheDocument();
  });

  it('should display user tier badge', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByText('pro')).toBeInTheDocument();
  });

  it('should display user initials in avatar', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });
});
