import type {
  GarmentCategory,
  ClothingSwapParams,
} from '@/types/generation';

const CATEGORY_INSTRUCTIONS: Record<GarmentCategory, string> = {
  tops:
    'Replace the top/shirt the model is wearing with the garment shown in the reference image. Keep the exact same fabric texture, color, pattern, logos, and print details from the garment reference. The garment should fit naturally on the model\'s body.',
  outerwear:
    'Add or replace the outerwear (jacket/coat) on the model with the garment shown in the reference image. Preserve every detail of the garment: fabric texture, zippers, buttons, pockets, logos, and stitching. The outerwear should drape naturally over the model.',
  bottoms:
    'Replace the bottom garment (pants/skirt) the model is wearing with the garment shown in the reference image. Maintain the exact fabric, wash, color, and pattern details. The fit should look natural with proper draping and creasing.',
  dresses:
    'Replace the model\'s entire outfit with the dress/one-piece shown in the reference image. Preserve the exact fabric, pattern, color, embellishments, and construction details. The dress should conform naturally to the model\'s body shape.',
  accessories:
    'Add the accessory shown in the reference image to the model\'s outfit. Place it naturally and realistically. Preserve all details, logos, textures, and colors of the accessory.',
};

const FIT_OPTION_INSTRUCTIONS: Record<string, string> = {
  tuckIn: 'The top should be neatly tucked into the bottoms.',
  sleeveRoll: 'The sleeves should be casually rolled up to just below the elbow.',
  buttonOpen: 'The top buttons should be left casually unbuttoned, showing a relaxed styling.',
  autoCoordination:
    'Automatically coordinate the rest of the outfit to complement the garment. Choose matching bottoms, shoes, and minimal accessories that create a cohesive, stylish look.',
};

const BASE_SWAP_INSTRUCTION = [
  'You are performing a clothing swap for a fashion lookbook.',
  'The first image is the model. The second image is the garment to apply.',
  '',
  'CRITICAL REQUIREMENTS:',
  '- Preserve the model\'s face, skin tone, body proportions, pose, and background EXACTLY.',
  '- Preserve the garment\'s exact appearance: fabric texture, color, pattern, logos, prints, and construction details.',
  '- The garment should fit naturally on the model with realistic wrinkles, draping, and shadows.',
  '- The lighting on the garment must match the scene lighting.',
  '- The result should look like a real photograph, not a digital composite.',
].join('\n');

const QUALITY_SUFFIX =
  'Output a photorealistic, high-resolution fashion lookbook photograph. Ultra sharp, professional color grading, natural shadows and highlights on the garment.';

export function buildSwapPrompt(params: ClothingSwapParams): string {
  const categoryInstruction = CATEGORY_INSTRUCTIONS[params.garmentCategory];

  const fitParts: string[] = [];
  if (params.fitOptions) {
    if (params.fitOptions.tuckIn) fitParts.push(FIT_OPTION_INSTRUCTIONS.tuckIn);
    if (params.fitOptions.sleeveRoll) fitParts.push(FIT_OPTION_INSTRUCTIONS.sleeveRoll);
    if (params.fitOptions.buttonOpen) fitParts.push(FIT_OPTION_INSTRUCTIONS.buttonOpen);
    if (params.fitOptions.autoCoordination) fitParts.push(FIT_OPTION_INSTRUCTIONS.autoCoordination);
  }

  const fitSection = fitParts.length > 0
    ? `\nStyling Instructions:\n${fitParts.map((p) => `- ${p}`).join('\n')}`
    : '';

  const parts = [
    BASE_SWAP_INSTRUCTION,
    '',
    `Garment Type: ${params.garmentCategory}`,
    categoryInstruction,
    fitSection,
    '',
    QUALITY_SUFFIX,
  ];

  return parts.join('\n');
}

export function buildSimpleSwapPrompt(garmentCategory: GarmentCategory): string {
  return buildSwapPrompt({
    modelImageBase64: '',
    garmentImageBase64: '',
    garmentCategory,
  });
}

export { CATEGORY_INSTRUCTIONS, FIT_OPTION_INSTRUCTIONS };
