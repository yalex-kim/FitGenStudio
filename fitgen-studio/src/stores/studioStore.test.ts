import { describe, it, expect, beforeEach } from 'vitest';
import { useStudioStore } from './studioStore';

describe('studioStore', () => {
  beforeEach(() => {
    useStudioStore.setState({
      leftTab: 'product',
      garments: [],
      selectedGarmentId: null,
      models: [],
      selectedModelId: null,
      references: [],
      presetType: null,
      gender: 'female',
      bodyType: 'slim',
      ageRange: '20s',
      tuckIn: false,
      sleeveRoll: false,
      buttonOpen: false,
      autoCoordination: false,
      backgroundPreset: 'white-studio',
      lightingPreset: 'studio',
      posePreset: 'standing-front',
      generatedImages: [],
      selectedImageIndex: null,
      isGenerating: false,
    });
  });

  describe('left panel - tabs', () => {
    it('should default to product tab', () => {
      expect(useStudioStore.getState().leftTab).toBe('product');
    });

    it('should change tab', () => {
      useStudioStore.getState().setLeftTab('models');
      expect(useStudioStore.getState().leftTab).toBe('models');
    });
  });

  describe('left panel - garments', () => {
    const mockGarment = {
      id: 'g1',
      name: 'T-Shirt',
      thumbnailUrl: '/thumb.jpg',
      originalUrl: '/original.jpg',
      category: 'tops' as const,
      createdAt: '2026-01-01',
    };

    it('should add a garment', () => {
      useStudioStore.getState().addGarment(mockGarment);
      expect(useStudioStore.getState().garments).toHaveLength(1);
      expect(useStudioStore.getState().garments[0].name).toBe('T-Shirt');
    });

    it('should remove a garment', () => {
      useStudioStore.getState().addGarment(mockGarment);
      useStudioStore.getState().removeGarment('g1');
      expect(useStudioStore.getState().garments).toHaveLength(0);
    });

    it('should select a garment', () => {
      useStudioStore.getState().selectGarment('g1');
      expect(useStudioStore.getState().selectedGarmentId).toBe('g1');
    });

    it('should deselect a garment', () => {
      useStudioStore.getState().selectGarment('g1');
      useStudioStore.getState().selectGarment(null);
      expect(useStudioStore.getState().selectedGarmentId).toBeNull();
    });
  });

  describe('left panel - models', () => {
    const mockModel = {
      id: 'm1',
      name: 'Model 1',
      imageUrl: '/model.jpg',
      thumbnailUrl: '/model.jpg',
      gender: 'female' as const,
      bodyType: 'slim' as const,
      createdAt: '2026-01-01',
    };

    it('should add a model', () => {
      useStudioStore.getState().addModel(mockModel);
      expect(useStudioStore.getState().models).toHaveLength(1);
    });

    it('should remove a model', () => {
      useStudioStore.getState().addModel(mockModel);
      useStudioStore.getState().removeModel('m1');
      expect(useStudioStore.getState().models).toHaveLength(0);
    });

    it('should select a model', () => {
      useStudioStore.getState().selectModel('m1');
      expect(useStudioStore.getState().selectedModelId).toBe('m1');
    });
  });

  describe('left panel - references', () => {
    const mockRef = {
      id: 'r1',
      name: 'Mood Board',
      thumbnailUrl: '/ref.jpg',
      originalUrl: '/ref-full.jpg',
      createdAt: '2026-01-01',
    };

    it('should add a reference', () => {
      useStudioStore.getState().addReference(mockRef);
      expect(useStudioStore.getState().references).toHaveLength(1);
    });

    it('should remove a reference', () => {
      useStudioStore.getState().addReference(mockRef);
      useStudioStore.getState().removeReference('r1');
      expect(useStudioStore.getState().references).toHaveLength(0);
    });
  });

  describe('right panel - model settings', () => {
    it('should set preset type', () => {
      useStudioStore.getState().setPresetType('chic');
      expect(useStudioStore.getState().presetType).toBe('chic');
    });

    it('should clear preset type', () => {
      useStudioStore.getState().setPresetType('chic');
      useStudioStore.getState().setPresetType(null);
      expect(useStudioStore.getState().presetType).toBeNull();
    });

    it('should set gender', () => {
      useStudioStore.getState().setGender('male');
      expect(useStudioStore.getState().gender).toBe('male');
    });

    it('should set body type', () => {
      useStudioStore.getState().setBodyType('athletic');
      expect(useStudioStore.getState().bodyType).toBe('athletic');
    });

    it('should set age range', () => {
      useStudioStore.getState().setAgeRange('30s');
      expect(useStudioStore.getState().ageRange).toBe('30s');
    });
  });

  describe('styling options', () => {
    it('should toggle tuck in', () => {
      useStudioStore.getState().setTuckIn(true);
      expect(useStudioStore.getState().tuckIn).toBe(true);
    });

    it('should toggle sleeve roll', () => {
      useStudioStore.getState().setSleeveRoll(true);
      expect(useStudioStore.getState().sleeveRoll).toBe(true);
    });

    it('should toggle button open', () => {
      useStudioStore.getState().setButtonOpen(true);
      expect(useStudioStore.getState().buttonOpen).toBe(true);
    });

    it('should toggle auto coordination', () => {
      useStudioStore.getState().setAutoCoordination(true);
      expect(useStudioStore.getState().autoCoordination).toBe(true);
    });
  });

  describe('director settings', () => {
    it('should set background preset', () => {
      useStudioStore.getState().setBackgroundPreset('outdoor-park');
      expect(useStudioStore.getState().backgroundPreset).toBe('outdoor-park');
    });

    it('should set lighting preset', () => {
      useStudioStore.getState().setLightingPreset('golden-hour');
      expect(useStudioStore.getState().lightingPreset).toBe('golden-hour');
    });

    it('should set pose preset', () => {
      useStudioStore.getState().setPosePreset('walking');
      expect(useStudioStore.getState().posePreset).toBe('walking');
    });
  });

  describe('canvas state', () => {
    it('should set generated images', () => {
      const images = [
        {
          id: 'img1',
          url: '/img1.jpg',
          thumbnailUrl: '/img1-thumb.jpg',
          prompt: 'test',
          modelId: 'm1',
          createdAt: '2026-01-01',
          status: 'completed' as const,
        },
      ];
      useStudioStore.getState().setGeneratedImages(images);
      expect(useStudioStore.getState().generatedImages).toHaveLength(1);
    });

    it('should set selected image index', () => {
      useStudioStore.getState().setSelectedImageIndex(2);
      expect(useStudioStore.getState().selectedImageIndex).toBe(2);
    });

    it('should track generating state', () => {
      useStudioStore.getState().setIsGenerating(true);
      expect(useStudioStore.getState().isGenerating).toBe(true);
      useStudioStore.getState().setIsGenerating(false);
      expect(useStudioStore.getState().isGenerating).toBe(false);
    });
  });
});
