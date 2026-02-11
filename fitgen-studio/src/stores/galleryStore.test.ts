import { describe, it, expect, beforeEach } from 'vitest';
import { useGalleryStore } from './galleryStore';

describe('galleryStore', () => {
  beforeEach(() => {
    useGalleryStore.setState({
      searchQuery: '',
      filterStyle: 'all',
      sortBy: 'newest',
      selectedIds: new Set(),
      detailImageId: null,
      isLoading: false,
    });
  });

  it('should have initial images', () => {
    expect(useGalleryStore.getState().images.length).toBeGreaterThan(0);
  });

  describe('filters', () => {
    it('should set sort order', () => {
      useGalleryStore.getState().setSortBy('oldest');
      expect(useGalleryStore.getState().sortBy).toBe('oldest');
    });

    it('should set filter style', () => {
      useGalleryStore.getState().setFilterStyle('chic');
      expect(useGalleryStore.getState().filterStyle).toBe('chic');
    });

    it('should set search query', () => {
      useGalleryStore.getState().setSearchQuery('test query');
      expect(useGalleryStore.getState().searchQuery).toBe('test query');
    });
  });

  describe('selection', () => {
    it('should toggle selection', () => {
      const firstId = useGalleryStore.getState().images[0].id;
      useGalleryStore.getState().toggleSelection(firstId);
      expect(useGalleryStore.getState().selectedIds.has(firstId)).toBe(true);

      useGalleryStore.getState().toggleSelection(firstId);
      expect(useGalleryStore.getState().selectedIds.has(firstId)).toBe(false);
    });

    it('should select all', () => {
      useGalleryStore.getState().selectAll();
      const { images, selectedIds } = useGalleryStore.getState();
      expect(selectedIds.size).toBe(images.length);
    });

    it('should clear selection', () => {
      useGalleryStore.getState().selectAll();
      useGalleryStore.getState().clearSelection();
      expect(useGalleryStore.getState().selectedIds.size).toBe(0);
    });
  });

  describe('detail view', () => {
    it('should open detail', () => {
      useGalleryStore.getState().openDetail('gen-0');
      expect(useGalleryStore.getState().detailImageId).toBe('gen-0');
    });

    it('should close detail', () => {
      useGalleryStore.getState().openDetail('gen-0');
      useGalleryStore.getState().closeDetail();
      expect(useGalleryStore.getState().detailImageId).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete images', () => {
      const initialCount = useGalleryStore.getState().images.length;
      useGalleryStore.getState().deleteImages(['gen-0', 'gen-1']);
      expect(useGalleryStore.getState().images.length).toBe(initialCount - 2);
    });

    it('should clear selection after delete', () => {
      useGalleryStore.getState().toggleSelection('gen-0');
      useGalleryStore.getState().deleteImages(['gen-0']);
      expect(useGalleryStore.getState().selectedIds.size).toBe(0);
    });

    it('should close detail if deleted image is in detail', () => {
      useGalleryStore.getState().openDetail('gen-0');
      useGalleryStore.getState().deleteImages(['gen-0']);
      expect(useGalleryStore.getState().detailImageId).toBeNull();
    });
  });
});
