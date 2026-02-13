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

import { useGalleryStore } from './galleryStore';
import type { GeneratedImage } from '@/types';

function makeImage(id: string): GeneratedImage {
  return {
    id,
    url: `https://example.com/${id}.png`,
    thumbnailUrl: `https://example.com/${id}-thumb.png`,
    prompt: `prompt for ${id}`,
    modelId: 'm1',
    createdAt: new Date().toISOString(),
    status: 'completed',
  };
}

describe('galleryStore', () => {
  beforeEach(() => {
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

  it('should start with empty images', () => {
    expect(useGalleryStore.getState().images.length).toBe(0);
  });

  describe('addImages', () => {
    it('should add images to the front', () => {
      const img1 = makeImage('img-1');
      const img2 = makeImage('img-2');
      useGalleryStore.getState().addImages([img1]);
      useGalleryStore.getState().addImages([img2]);
      const { images } = useGalleryStore.getState();
      expect(images.length).toBe(2);
      expect(images[0].id).toBe('img-2');
      expect(images[1].id).toBe('img-1');
    });
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
    beforeEach(() => {
      useGalleryStore.getState().addImages([makeImage('s1'), makeImage('s2')]);
    });

    it('should toggle selection', () => {
      useGalleryStore.getState().toggleSelection('s1');
      expect(useGalleryStore.getState().selectedIds.has('s1')).toBe(true);

      useGalleryStore.getState().toggleSelection('s1');
      expect(useGalleryStore.getState().selectedIds.has('s1')).toBe(false);
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
      useGalleryStore.getState().openDetail('d1');
      expect(useGalleryStore.getState().detailImageId).toBe('d1');
    });

    it('should close detail', () => {
      useGalleryStore.getState().openDetail('d1');
      useGalleryStore.getState().closeDetail();
      expect(useGalleryStore.getState().detailImageId).toBeNull();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      useGalleryStore.getState().addImages([makeImage('del-1'), makeImage('del-2'), makeImage('del-3')]);
    });

    it('should delete images', () => {
      useGalleryStore.getState().deleteImages(['del-1', 'del-2']);
      expect(useGalleryStore.getState().images.length).toBe(1);
    });

    it('should clear selection after delete', () => {
      useGalleryStore.getState().toggleSelection('del-1');
      useGalleryStore.getState().deleteImages(['del-1']);
      expect(useGalleryStore.getState().selectedIds.size).toBe(0);
    });

    it('should close detail if deleted image is in detail', () => {
      useGalleryStore.getState().openDetail('del-1');
      useGalleryStore.getState().deleteImages(['del-1']);
      expect(useGalleryStore.getState().detailImageId).toBeNull();
    });
  });
});
