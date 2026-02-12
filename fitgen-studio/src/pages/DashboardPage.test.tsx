import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { DashboardPage } from './DashboardPage';
import { useAuthStore } from '@/stores/authStore';
import { useAssetStore } from '@/stores/assetStore';
import { useUsageStore } from '@/stores/usageStore';
import { useGalleryStore } from '@/stores/galleryStore';

// Mock Supabase (required by assetStore)
vi.mock('@/lib/supabase', () => {
  const chainable = () => {
    const obj: Record<string, any> = {};
    for (const m of ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'single']) {
      obj[m] = vi.fn().mockReturnValue(obj);
    }
    obj.then = vi.fn().mockImplementation((cb: any) => { cb?.({ data: [], error: null }); return obj; });
    return obj;
  };
  return { supabase: { ...chainable(), storage: { from: vi.fn().mockReturnValue({ upload: vi.fn(), getPublicUrl: vi.fn() }) } } };
});

describe('DashboardPage', () => {
  beforeEach(() => {
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
    useAssetStore.setState({
      models: [
        { id: 'm1', name: 'Model A', thumbnailUrl: '', imageUrl: '', gender: 'female', bodyType: 'slim', createdAt: '' },
        { id: 'm2', name: 'Model B', thumbnailUrl: '', imageUrl: '', gender: 'male', bodyType: 'athletic', createdAt: '' },
      ],
      isLoading: false,
    });
    useUsageStore.setState({
      usedThisMonth: 13,
      currentMonth: '2026-02',
    });
    useGalleryStore.setState({
      images: [
        { id: 'g1', url: '', thumbnailUrl: '', prompt: 'Spring editorial look', modelId: 'm1', createdAt: '2026-02-10T10:00:00Z', status: 'completed' as const },
        { id: 'g2', url: '', thumbnailUrl: '', prompt: 'Street style outfit', modelId: 'm2', createdAt: '2026-02-09T10:00:00Z', status: 'completed' as const },
      ],
    });
  });

  it('should display welcome message with user first name', () => {
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText(/welcome back, demo/i)).toBeInTheDocument();
  });

  it('should display quick action buttons', () => {
    renderWithRouter(<DashboardPage />);
    expect(screen.getByRole('button', { name: /new lookbook/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload garment/i })).toBeInTheDocument();
  });

  it('should display stats cards', () => {
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText('Images Generated')).toBeInTheDocument();
    expect(screen.getByText('Models Saved')).toBeInTheDocument();
    expect(screen.getByText('Credits Remaining')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('should display usage-based stats from stores', () => {
    renderWithRouter(<DashboardPage />);
    // usedThisMonth = 13
    expect(screen.getByText('13')).toBeInTheDocument();
    // models.length = 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display credits from usageStore', () => {
    renderWithRouter(<DashboardPage />);
    // Pro tier: limit=500, used=13, remaining=487
    expect(screen.getByText('487')).toBeInTheDocument();
    expect(screen.getByText('of 500 total')).toBeInTheDocument();
  });

  it('should display recent generations from gallery', () => {
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText('Recent Generations')).toBeInTheDocument();
    expect(screen.getByText('Spring editorial look')).toBeInTheDocument();
    expect(screen.getByText('Street style outfit')).toBeInTheDocument();
  });

  it('should display View all button', () => {
    renderWithRouter(<DashboardPage />);
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });

  it('should show pro tier', () => {
    renderWithRouter(<DashboardPage />);
    const proElements = screen.getAllByText(/pro/i);
    expect(proElements.length).toBeGreaterThan(0);
  });

  it('should show empty state when no gallery images', () => {
    useGalleryStore.setState({ images: [] });
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText(/no images generated yet/i)).toBeInTheDocument();
  });
});
