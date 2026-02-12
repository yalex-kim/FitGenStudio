import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { AssetLibraryPage } from './AssetLibraryPage';
import { useAssetStore } from '@/stores/assetStore';

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

vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: vi.fn().mockReturnValue({ user: null }) },
}));

describe('AssetLibraryPage', () => {
  beforeEach(() => {
    useAssetStore.setState({
      activeCategory: 'garments',
      searchQuery: '',
      selectedIds: new Set(),
      isUploading: false,
    });
  });

  it('should render asset library heading', () => {
    renderWithRouter(<AssetLibraryPage />);
    expect(screen.getByRole('heading', { name: /asset library/i })).toBeInTheDocument();
  });

  it('should render description', () => {
    renderWithRouter(<AssetLibraryPage />);
    expect(screen.getByText(/manage your models, garments, and reference images/i)).toBeInTheDocument();
  });

  it('should render tab buttons', () => {
    renderWithRouter(<AssetLibraryPage />);
    expect(screen.getByRole('tab', { name: /my clothes/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /my models/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /references/i })).toBeInTheDocument();
  });

  it('should render search input', () => {
    renderWithRouter(<AssetLibraryPage />);
    expect(screen.getByPlaceholderText(/search assets/i)).toBeInTheDocument();
  });
});
