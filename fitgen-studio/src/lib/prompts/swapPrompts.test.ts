import { describe, it, expect } from 'vitest';
import {
  buildSwapPrompt,
  buildSimpleSwapPrompt,
  CATEGORY_INSTRUCTIONS,
  FIT_OPTION_INSTRUCTIONS,
} from './swapPrompts';

describe('swapPrompts', () => {
  describe('buildSwapPrompt', () => {
    it('should include base swap instruction', () => {
      const prompt = buildSwapPrompt({
        modelImageBase64: 'abc',
        garmentImageBase64: 'def',
        garmentCategory: 'tops',
      });
      expect(prompt).toContain('clothing swap for a fashion lookbook');
      expect(prompt).toContain('CRITICAL REQUIREMENTS');
    });

    it('should include category-specific instruction for tops', () => {
      const prompt = buildSwapPrompt({
        modelImageBase64: '',
        garmentImageBase64: '',
        garmentCategory: 'tops',
      });
      expect(prompt).toContain(CATEGORY_INSTRUCTIONS.tops);
    });

    it('should include category-specific instruction for each category', () => {
      for (const cat of ['tops', 'outerwear', 'bottoms', 'dresses', 'accessories'] as const) {
        const prompt = buildSwapPrompt({
          modelImageBase64: '',
          garmentImageBase64: '',
          garmentCategory: cat,
        });
        expect(prompt).toContain(CATEGORY_INSTRUCTIONS[cat]);
      }
    });

    it('should include fit options when provided', () => {
      const prompt = buildSwapPrompt({
        modelImageBase64: '',
        garmentImageBase64: '',
        garmentCategory: 'tops',
        fitOptions: {
          tuckIn: true,
          sleeveRoll: true,
        },
      });
      expect(prompt).toContain('Styling Instructions');
      expect(prompt).toContain(FIT_OPTION_INSTRUCTIONS.tuckIn);
      expect(prompt).toContain(FIT_OPTION_INSTRUCTIONS.sleeveRoll);
    });

    it('should not include fit section when no fit options', () => {
      const prompt = buildSwapPrompt({
        modelImageBase64: '',
        garmentImageBase64: '',
        garmentCategory: 'tops',
      });
      expect(prompt).not.toContain('Styling Instructions');
    });

    it('should include all active fit options', () => {
      const prompt = buildSwapPrompt({
        modelImageBase64: '',
        garmentImageBase64: '',
        garmentCategory: 'tops',
        fitOptions: {
          tuckIn: true,
          sleeveRoll: true,
          buttonOpen: true,
          autoCoordination: true,
        },
      });
      expect(prompt).toContain(FIT_OPTION_INSTRUCTIONS.tuckIn);
      expect(prompt).toContain(FIT_OPTION_INSTRUCTIONS.sleeveRoll);
      expect(prompt).toContain(FIT_OPTION_INSTRUCTIONS.buttonOpen);
      expect(prompt).toContain(FIT_OPTION_INSTRUCTIONS.autoCoordination);
    });

    it('should skip false fit options', () => {
      const prompt = buildSwapPrompt({
        modelImageBase64: '',
        garmentImageBase64: '',
        garmentCategory: 'tops',
        fitOptions: {
          tuckIn: false,
          sleeveRoll: true,
        },
      });
      expect(prompt).not.toContain(FIT_OPTION_INSTRUCTIONS.tuckIn);
      expect(prompt).toContain(FIT_OPTION_INSTRUCTIONS.sleeveRoll);
    });

    it('should include quality suffix', () => {
      const prompt = buildSwapPrompt({
        modelImageBase64: '',
        garmentImageBase64: '',
        garmentCategory: 'tops',
      });
      expect(prompt).toContain('photorealistic');
    });
  });

  describe('buildSimpleSwapPrompt', () => {
    it('should create a prompt for the given category', () => {
      const prompt = buildSimpleSwapPrompt('outerwear');
      expect(prompt).toContain(CATEGORY_INSTRUCTIONS.outerwear);
      expect(prompt).toContain('clothing swap');
    });
  });

  describe('CATEGORY_INSTRUCTIONS', () => {
    it('should cover all categories', () => {
      expect(Object.keys(CATEGORY_INSTRUCTIONS)).toEqual([
        'tops',
        'outerwear',
        'bottoms',
        'dresses',
        'accessories',
      ]);
    });
  });

  describe('FIT_OPTION_INSTRUCTIONS', () => {
    it('should have instructions for all fit options', () => {
      expect(FIT_OPTION_INSTRUCTIONS.tuckIn).toBeDefined();
      expect(FIT_OPTION_INSTRUCTIONS.sleeveRoll).toBeDefined();
      expect(FIT_OPTION_INSTRUCTIONS.buttonOpen).toBeDefined();
      expect(FIT_OPTION_INSTRUCTIONS.autoCoordination).toBeDefined();
    });
  });
});
