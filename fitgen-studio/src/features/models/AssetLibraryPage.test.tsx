import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { AssetLibraryPage } from './AssetLibraryPage';
import { useAssetStore } from '@/stores/assetStore';

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
