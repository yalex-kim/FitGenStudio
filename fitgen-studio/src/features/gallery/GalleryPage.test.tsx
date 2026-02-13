import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => {
  const chainable = () => {
    const obj: Record<string, any> = {};
    for (const m of ['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'single', 'gte']) {
      obj[m] = vi.fn().mockReturnValue(obj);
    }
    obj.then = vi.fn().mockImplementation((cb: any) => { cb?.({ data: [], error: null }); return obj; });
    return obj;
  };
  return { supabase: { ...chainable(), storage: { from: vi.fn().mockReturnValue({ upload: vi.fn(), getPublicUrl: vi.fn() }) } } };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: vi.fn().mockReturnValue({ user: null }) },
}));

import { renderWithRouter, screen } from '@/test/test-utils';
import { GalleryPage } from './GalleryPage';
import { useGalleryStore } from '@/stores/galleryStore';

describe('GalleryPage', () => {
  beforeEach(() => {
    // Reset store to initial state with mock images
    useGalleryStore.setState({
      images: [],
      searchQuery: '',
      filterStyle: 'all',
      sortBy: 'newest',
      selectedIds: new Set(),
      detailImageId: null,
      isLoading: false,
    });
  });

  it('should render gallery heading', () => {
    renderWithRouter(<GalleryPage />);
    expect(screen.getByRole('heading', { name: /gallery/i })).toBeInTheDocument();
  });

  it('should render search input', () => {
    renderWithRouter(<GalleryPage />);
    expect(screen.getByPlaceholderText(/search by prompt/i)).toBeInTheDocument();
  });

  it('should render gallery description', () => {
    renderWithRouter(<GalleryPage />);
    expect(screen.getByText(/browse your generated lookbook images/i)).toBeInTheDocument();
  });

  it('should display images from the store', () => {
    useGalleryStore.getState().addImages([
      {
        id: 'test-1',
        url: 'https://example.com/1.png',
        thumbnailUrl: 'https://example.com/1-thumb.png',
        prompt: 'Chic editorial model in white studio',
        modelId: 'm1',
        createdAt: new Date().toISOString(),
        status: 'completed',
      },
    ]);
    renderWithRouter(<GalleryPage />);
    const matches = screen.getAllByText(/chic editorial model/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
