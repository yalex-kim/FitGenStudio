import type {
  PosePreset,
  BackgroundPreset,
  LightingPreset,
  VariationParams,
} from '@/types/generation';
import {
  POSE_DESCRIPTORS,
  BACKGROUND_DESCRIPTORS,
  LIGHTING_DESCRIPTORS,
} from './modelPrompts';

const BASE_VARIATION_INSTRUCTION = [
  'You are generating a pose and background variation of an existing fashion model.',
  'The provided image is the base model. Generate a new image of the SAME person with a different pose and/or background.',
  '',
  'CRITICAL REQUIREMENTS:',
  '- The person must be the SAME individual: identical face, skin tone, hair, and body proportions.',
  '- Keep the same clothing/outfit from the reference image.',
  '- Only change the pose, background, and lighting as instructed below.',
  '- The result should look like a real photograph taken during the same photo session.',
].join('\n');

const QUALITY_SUFFIX =
  'Output a photorealistic, high-resolution fashion lookbook photograph. Ultra sharp, professional color grading, consistent with the original image quality.';

export function buildVariationPrompt(params: VariationParams): string {
  const poseDesc = POSE_DESCRIPTORS[params.pose];
  const bgDesc =
    params.background === 'custom' && params.customBackground
      ? params.customBackground
      : BACKGROUND_DESCRIPTORS[params.background];
  const lightingDesc = LIGHTING_DESCRIPTORS[params.lighting];

  const parts = [
    BASE_VARIATION_INSTRUCTION,
    '',
    `New Pose: ${poseDesc}`,
    '',
    `New Background: ${bgDesc}`,
    '',
    `Lighting: ${lightingDesc}`,
    '',
    QUALITY_SUFFIX,
  ];

  return parts.join('\n');
}

export function buildQuickVariationPrompt(
  pose: PosePreset,
  background: BackgroundPreset = 'studio-white',
  lighting: LightingPreset = 'studio',
): string {
  return buildVariationPrompt({
    modelImageBase64: '',
    pose,
    background,
    lighting,
  });
}
