import { describe, it, expect, beforeEach } from 'vitest';
import { useAssetStore } from './assetStore';

// Mock data matching what the store's initialize() would load
const MOCK_MODELS = [
  { id: 'm1', name: 'Chic Model A', thumbnailUrl: '', presetType: 'chic' as const, gender: 'female' as const, bodyType: 'slim' as const, createdAt: '2026-02-10T10:00:00Z' },
  { id: 'm2', name: 'Sporty Model B', thumbnailUrl: '', presetType: 'sporty' as const, gender: 'female' as const, bodyType: 'athletic' as const, createdAt: '2026-02-09T14:30:00Z' },
  { id: 'm3', name: 'Street Male', thumbnailUrl: '', presetType: 'street' as const, gender: 'male' as const, bodyType: 'athletic' as const, createdAt: '2026-02-08T09:15:00Z' },
  { id: 'm4', name: 'Lovely Model C', thumbnailUrl: '', presetType: 'lovely' as const, gender: 'female' as const, bodyType: 'slim' as const, createdAt: '2026-02-07T16:45:00Z' },
];

const MOCK_GARMENTS = [
  { id: 'g1', name: 'White Blouse', thumbnailUrl: '', originalUrl: '', category: 'tops' as const, createdAt: '2026-02-10T11:00:00Z' },
  { id: 'g2', name: 'Denim Jacket', thumbnailUrl: '', originalUrl: '', category: 'outerwear' as const, createdAt: '2026-02-09T13:00:00Z' },
  { id: 'g3', name: 'Black Skirt', thumbnailUrl: '', originalUrl: '', category: 'bottoms' as const, createdAt: '2026-02-08T15:00:00Z' },
  { id: 'g4', name: 'Floral Dress', thumbnailUrl: '', originalUrl: '', category: 'dresses' as const, createdAt: '2026-02-07T10:00:00Z' },
  { id: 'g5', name: 'Striped T-Shirt', thumbnailUrl: '', originalUrl: '', category: 'tops' as const, createdAt: '2026-02-06T09:00:00Z' },
  { id: 'g6', name: 'Leather Bag', thumbnailUrl: '', originalUrl: '', category: 'accessories' as const, createdAt: '2026-02-05T14:00:00Z' },
];

const MOCK_REFERENCES = [
  { id: 'r1', name: 'Editorial Lighting Ref', thumbnailUrl: '', originalUrl: '', createdAt: '2026-02-10T12:00:00Z' },
  { id: 'r2', name: 'Street Style Mood', thumbnailUrl: '', originalUrl: '', createdAt: '2026-02-09T08:00:00Z' },
];

describe('assetStore', () => {
  beforeEach(() => {
    useAssetStore.setState({
      models: [...MOCK_MODELS],
      garments: [...MOCK_GARMENTS],
      references: [...MOCK_REFERENCES],
      activeCategory: 'garments',
      searchQuery: '',
      selectedIds: new Set(),
      isUploading: false,
      isLoading: false,
    });
  });

  it('should have initial mock data', () => {
    const state = useAssetStore.getState();
    expect(state.models.length).toBeGreaterThan(0);
    expect(state.garments.length).toBeGreaterThan(0);
    expect(state.references.length).toBeGreaterThan(0);
  });

  describe('category', () => {
    it('should default to garments', () => {
      expect(useAssetStore.getState().activeCategory).toBe('garments');
    });

    it('should change category and clear selection', () => {
      useAssetStore.getState().toggleSelection('g1');
      useAssetStore.getState().setActiveCategory('models');
      const state = useAssetStore.getState();
      expect(state.activeCategory).toBe('models');
      expect(state.selectedIds.size).toBe(0);
    });
  });

  describe('search', () => {
    it('should set search query', () => {
      useAssetStore.getState().setSearchQuery('blouse');
      expect(useAssetStore.getState().searchQuery).toBe('blouse');
    });
  });

  describe('selection', () => {
    it('should toggle selection', () => {
      useAssetStore.getState().toggleSelection('g1');
      expect(useAssetStore.getState().selectedIds.has('g1')).toBe(true);
      useAssetStore.getState().toggleSelection('g1');
      expect(useAssetStore.getState().selectedIds.has('g1')).toBe(false);
    });

    it('should select all in current category', () => {
      useAssetStore.getState().selectAll();
      const { garments, selectedIds } = useAssetStore.getState();
      expect(selectedIds.size).toBe(garments.length);
    });

    it('should clear selection', () => {
      useAssetStore.getState().selectAll();
      useAssetStore.getState().clearSelection();
      expect(useAssetStore.getState().selectedIds.size).toBe(0);
    });
  });

  describe('CRUD', () => {
    it('should add a model', () => {
      const initialCount = useAssetStore.getState().models.length;
      useAssetStore.getState().addModel({
        id: 'new-m',
        name: 'New Model',
        imageUrl: '',
        thumbnailUrl: '',
        gender: 'female',
        bodyType: 'slim',
        createdAt: '2026-02-11',
      });
      expect(useAssetStore.getState().models.length).toBe(initialCount + 1);
    });

    it('should add a garment', () => {
      const initialCount = useAssetStore.getState().garments.length;
      useAssetStore.getState().addGarment({
        id: 'new-g',
        name: 'New Garment',
        thumbnailUrl: '',
        originalUrl: '',
        category: 'tops',
        createdAt: '2026-02-11',
      });
      expect(useAssetStore.getState().garments.length).toBe(initialCount + 1);
    });

    it('should remove assets', () => {
      const initialCount = useAssetStore.getState().garments.length;
      useAssetStore.getState().removeAssets(['g1']);
      expect(useAssetStore.getState().garments.length).toBe(initialCount - 1);
    });

    it('should rename an asset', () => {
      useAssetStore.getState().renameAsset('g1', 'Renamed Garment');
      const garment = useAssetStore.getState().garments.find(g => g.id === 'g1');
      expect(garment?.name).toBe('Renamed Garment');
    });
  });
});
