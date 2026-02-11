import { describe, it, expect } from 'vitest';
import {
  buildModelPrompt,
  buildPresetModelPrompt,
  GENDER_DESCRIPTORS,
  BODY_TYPE_DESCRIPTORS,
  STYLE_DESCRIPTORS,
  POSE_DESCRIPTORS,
  BACKGROUND_DESCRIPTORS,
  LIGHTING_DESCRIPTORS,
} from './modelPrompts';
import type { ModelGenerationParams } from '@/types/generation';

const baseParams: ModelGenerationParams = {
  gender: 'female',
  bodyType: 'slim',
  ageRange: '20s',
  style: 'chic',
  pose: 'standing-front',
  background: 'studio-white',
  lighting: 'studio',
};

describe('modelPrompts', () => {
  describe('buildModelPrompt', () => {
    it('should include all required sections', () => {
      const prompt = buildModelPrompt(baseParams);
      expect(prompt).toContain('photorealistic');
      expect(prompt).toContain(GENDER_DESCRIPTORS.female);
      expect(prompt).toContain(BODY_TYPE_DESCRIPTORS.slim);
      expect(prompt).toContain('her early to mid 20s');
      expect(prompt).toContain(STYLE_DESCRIPTORS.chic);
      expect(prompt).toContain(POSE_DESCRIPTORS['standing-front']);
      expect(prompt).toContain(BACKGROUND_DESCRIPTORS['studio-white']);
      expect(prompt).toContain(LIGHTING_DESCRIPTORS.studio);
    });

    it('should use correct gender pronouns for female', () => {
      const prompt = buildModelPrompt({ ...baseParams, gender: 'female' });
      expect(prompt).toContain('her early to mid 20s');
      expect(prompt).not.toContain('his early to mid 20s');
    });

    it('should use correct gender pronouns for male', () => {
      const prompt = buildModelPrompt({ ...baseParams, gender: 'male' });
      expect(prompt).toContain('his early to mid 20s');
      expect(prompt).not.toContain('her early to mid 20s');
    });

    it('should include ethnicity when provided', () => {
      const prompt = buildModelPrompt({ ...baseParams, ethnicity: 'Korean' });
      expect(prompt).toContain('Korean ethnicity');
    });

    it('should not include ethnicity when not provided', () => {
      const prompt = buildModelPrompt(baseParams);
      expect(prompt).not.toContain('ethnicity');
    });

    it('should include hair details when provided', () => {
      const prompt = buildModelPrompt({
        ...baseParams,
        hairStyle: 'long straight',
        hairColor: 'black',
      });
      expect(prompt).toContain('long straight hairstyle');
      expect(prompt).toContain('black hair color');
    });

    it('should use custom background when set', () => {
      const prompt = buildModelPrompt({
        ...baseParams,
        background: 'custom',
        customBackground: 'A rooftop garden at sunset',
      });
      expect(prompt).toContain('A rooftop garden at sunset');
    });

    it('should handle all style presets', () => {
      for (const style of ['lovely', 'chic', 'sporty', 'street'] as const) {
        const prompt = buildModelPrompt({ ...baseParams, style });
        expect(prompt).toContain(STYLE_DESCRIPTORS[style]);
      }
    });

    it('should handle all body types', () => {
      for (const bodyType of ['slim', 'athletic', 'plus-size'] as const) {
        const prompt = buildModelPrompt({ ...baseParams, bodyType });
        expect(prompt).toContain(BODY_TYPE_DESCRIPTORS[bodyType]);
      }
    });

    it('should include quality suffix', () => {
      const prompt = buildModelPrompt(baseParams);
      expect(prompt).toContain('8K quality');
      expect(prompt).toContain('85mm lens');
    });
  });

  describe('buildPresetModelPrompt', () => {
    it('should generate a prompt with default parameters', () => {
      const prompt = buildPresetModelPrompt('lovely');
      expect(prompt).toContain(STYLE_DESCRIPTORS.lovely);
      expect(prompt).toContain(GENDER_DESCRIPTORS.female);
      expect(prompt).toContain(POSE_DESCRIPTORS['standing-front']);
      expect(prompt).toContain(BACKGROUND_DESCRIPTORS['studio-white']);
    });

    it('should accept custom gender, pose, and background', () => {
      const prompt = buildPresetModelPrompt('sporty', 'male', 'walking', 'outdoor-park');
      expect(prompt).toContain(GENDER_DESCRIPTORS.male);
      expect(prompt).toContain(POSE_DESCRIPTORS.walking);
      expect(prompt).toContain(BACKGROUND_DESCRIPTORS['outdoor-park']);
    });
  });

  describe('descriptor records', () => {
    it('should have all gender entries', () => {
      expect(Object.keys(GENDER_DESCRIPTORS)).toEqual(['female', 'male']);
    });

    it('should have all pose entries', () => {
      expect(Object.keys(POSE_DESCRIPTORS)).toContain('standing-front');
      expect(Object.keys(POSE_DESCRIPTORS)).toContain('walking');
      expect(Object.keys(POSE_DESCRIPTORS)).toContain('seated');
      expect(Object.keys(POSE_DESCRIPTORS)).toContain('dynamic');
    });

    it('should have all background entries', () => {
      expect(Object.keys(BACKGROUND_DESCRIPTORS)).toContain('studio-white');
      expect(Object.keys(BACKGROUND_DESCRIPTORS)).toContain('outdoor-park');
      expect(Object.keys(BACKGROUND_DESCRIPTORS)).toContain('lifestyle-cafe');
      expect(Object.keys(BACKGROUND_DESCRIPTORS)).toContain('custom');
    });

    it('should have all lighting entries', () => {
      expect(Object.keys(LIGHTING_DESCRIPTORS)).toEqual([
        'studio',
        'golden-hour',
        'overcast',
        'flash',
      ]);
    });
  });
});
