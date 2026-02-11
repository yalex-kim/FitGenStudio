import { describe, it, expect } from 'vitest';
import { buildVariationPrompt, buildQuickVariationPrompt } from './variationPrompts';
import { POSE_DESCRIPTORS, BACKGROUND_DESCRIPTORS, LIGHTING_DESCRIPTORS } from './modelPrompts';

describe('variationPrompts', () => {
  describe('buildVariationPrompt', () => {
    it('should include base variation instruction', () => {
      const prompt = buildVariationPrompt({
        modelImageBase64: '',
        pose: 'walking',
        background: 'outdoor-park',
        lighting: 'golden-hour',
      });
      expect(prompt).toContain('pose and background variation');
      expect(prompt).toContain('CRITICAL REQUIREMENTS');
      expect(prompt).toContain('SAME individual');
    });

    it('should include pose descriptor', () => {
      const prompt = buildVariationPrompt({
        modelImageBase64: '',
        pose: 'seated',
        background: 'studio-white',
        lighting: 'studio',
      });
      expect(prompt).toContain(POSE_DESCRIPTORS.seated);
    });

    it('should include background descriptor', () => {
      const prompt = buildVariationPrompt({
        modelImageBase64: '',
        pose: 'standing-front',
        background: 'lifestyle-cafe',
        lighting: 'studio',
      });
      expect(prompt).toContain(BACKGROUND_DESCRIPTORS['lifestyle-cafe']);
    });

    it('should include lighting descriptor', () => {
      const prompt = buildVariationPrompt({
        modelImageBase64: '',
        pose: 'standing-front',
        background: 'studio-white',
        lighting: 'flash',
      });
      expect(prompt).toContain(LIGHTING_DESCRIPTORS.flash);
    });

    it('should use custom background when set', () => {
      const prompt = buildVariationPrompt({
        modelImageBase64: '',
        pose: 'standing-front',
        background: 'custom',
        lighting: 'studio',
        customBackground: 'A modern art gallery',
      });
      expect(prompt).toContain('A modern art gallery');
    });

    it('should include quality suffix', () => {
      const prompt = buildVariationPrompt({
        modelImageBase64: '',
        pose: 'dynamic',
        background: 'outdoor-street',
        lighting: 'overcast',
      });
      expect(prompt).toContain('photorealistic');
    });
  });

  describe('buildQuickVariationPrompt', () => {
    it('should generate a prompt with defaults', () => {
      const prompt = buildQuickVariationPrompt('walking');
      expect(prompt).toContain(POSE_DESCRIPTORS.walking);
      expect(prompt).toContain(BACKGROUND_DESCRIPTORS['studio-white']);
      expect(prompt).toContain(LIGHTING_DESCRIPTORS.studio);
    });

    it('should accept custom background and lighting', () => {
      const prompt = buildQuickVariationPrompt('seated', 'outdoor-urban', 'golden-hour');
      expect(prompt).toContain(POSE_DESCRIPTORS.seated);
      expect(prompt).toContain(BACKGROUND_DESCRIPTORS['outdoor-urban']);
      expect(prompt).toContain(LIGHTING_DESCRIPTORS['golden-hour']);
    });
  });
});
