import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { act } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { useAuthStore } from '@/stores/authStore';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'demo@fitgen.studio',
        name: 'Demo User',
        tier: 'pro',
        creditsRemaining: 487,
        creditsTotal: 500,
      },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderAndWaitForLoad() {
    renderWithRouter(<DashboardPage />);
    // Advance past the 600ms loading timer inside act() to flush state updates
    act(() => {
      vi.advanceTimersByTime(700);
    });
  }

  it('should display welcome message with user first name', () => {
    renderAndWaitForLoad();
    expect(screen.getByText(/welcome back, demo/i)).toBeInTheDocument();
  });

  it('should display quick action buttons', () => {
    renderAndWaitForLoad();
    expect(screen.getByRole('button', { name: /new lookbook/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload garment/i })).toBeInTheDocument();
  });

  it('should display stats cards', () => {
    renderAndWaitForLoad();
    expect(screen.getByText('Images Generated')).toBeInTheDocument();
    expect(screen.getByText('Models Saved')).toBeInTheDocument();
    expect(screen.getByText('Credits Remaining')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('should display user credits', () => {
    renderAndWaitForLoad();
    expect(screen.getByText('487')).toBeInTheDocument();
    expect(screen.getByText('of 500 total')).toBeInTheDocument();
  });

  it('should display recent projects', () => {
    renderAndWaitForLoad();
    expect(screen.getByText('Recent Projects')).toBeInTheDocument();
    expect(screen.getByText('Spring Collection')).toBeInTheDocument();
    expect(screen.getByText('Street Wear Lookbook')).toBeInTheDocument();
    expect(screen.getByText('Summer Essentials')).toBeInTheDocument();
    expect(screen.getByText('Casual Basics')).toBeInTheDocument();
  });

  it('should display View all button', () => {
    renderAndWaitForLoad();
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });

  it('should show pro tier', () => {
    renderAndWaitForLoad();
    // The tier is displayed as bold text in the Plan card
    const proElements = screen.getAllByText(/pro/i);
    expect(proElements.length).toBeGreaterThan(0);
  });
});
