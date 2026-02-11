import { describe, it, expect, beforeEach } from 'vitest';
import { renderWithRouter, screen } from '@/test/test-utils';
import { GalleryPage } from './GalleryPage';
import { useGalleryStore } from '@/stores/galleryStore';

describe('GalleryPage', () => {
  beforeEach(() => {
    // Reset store to initial state with mock images
    useGalleryStore.setState({
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
    renderWithRouter(<GalleryPage />);
    // The store has mock images with prompts
    const matches = screen.getAllByText(/chic editorial model/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
