import type {
  Gender,
  BodyType,
  AgeRange,
  StylePreset,
  PosePreset,
  BackgroundPreset,
  LightingPreset,
  ModelGenerationParams,
} from '@/types/generation';

const GENDER_DESCRIPTORS: Record<Gender, string> = {
  female: 'a beautiful female fashion model',
  male: 'a handsome male fashion model',
};

const BODY_TYPE_DESCRIPTORS: Record<BodyType, string> = {
  slim: 'with a slim, elegant build',
  athletic: 'with an athletic, toned build',
  'plus-size': 'with a plus-size, curvy build',
};

const AGE_DESCRIPTORS: Record<AgeRange, string> = {
  '20s': 'in her/his early to mid 20s',
  '30s': 'in her/his early to mid 30s',
  '40s': 'in her/his early to mid 40s',
};

const STYLE_DESCRIPTORS: Record<StylePreset, string> = {
  lovely:
    'Soft, feminine aesthetic. Warm pastel tones, gentle natural makeup, approachable and friendly expression. Romantic and youthful vibe with delicate styling.',
  chic:
    'Sophisticated editorial style. Sharp, polished appearance with bold confidence. Clean lines, minimal jewelry, and a powerful yet elegant presence.',
  sporty:
    'Active, energetic appearance. Fresh-faced with minimal makeup, healthy glow, and dynamic body language. Casual-athletic styling with a vibrant aura.',
  street:
    'Urban casual street fashion look. Effortlessly cool with relaxed confidence. Modern edge, layered accessories, and an authentic street-style attitude.',
};

const POSE_DESCRIPTORS: Record<PosePreset, string> = {
  'standing-front':
    'Standing facing the camera directly, arms relaxed at sides, weight evenly distributed. Full body visible from head to toe.',
  'standing-three-quarter':
    'Standing at a 3/4 angle to the camera, body slightly turned. One hand may rest on hip. Full body visible.',
  'standing-side':
    'Standing in profile view, body turned sideways to the camera. Head slightly turned toward camera. Full body visible.',
  walking:
    'Captured mid-stride in a natural walking pose. One foot forward, arms swinging naturally. Dynamic movement with full body visible.',
  seated:
    'Seated on a stool or bench, posture upright and elegant. Legs crossed or positioned attractively. Upper and lower body visible.',
  dynamic:
    'Expressive action pose with movement and energy. Could be turning, jumping slightly, or striking a fashion editorial pose. Full body visible.',
};

const BACKGROUND_DESCRIPTORS: Record<BackgroundPreset, string> = {
  'studio-white': 'Clean white seamless studio background with professional lighting. Minimalist and modern.',
  'studio-gray': 'Neutral gray seamless studio background with soft, even lighting.',
  'studio-colored': 'Pastel-colored seamless studio background, soft and modern aesthetic.',
  'outdoor-park': 'Lush green park setting with trees and natural sunlight filtering through leaves.',
  'outdoor-street': 'Urban city street with interesting architecture, storefronts, and natural ambient light.',
  'outdoor-urban': 'Modern urban landscape with concrete, glass buildings, and contemporary architecture.',
  'outdoor-nature': 'Beautiful natural setting with rolling hills, open sky, and soft natural light.',
  'lifestyle-cafe': 'Stylish cafe interior with warm ambient lighting, coffee shop atmosphere, and modern decor.',
  'lifestyle-office': 'Modern, minimalist office space with clean lines, natural light from large windows.',
  'lifestyle-home': 'Cozy, well-decorated home interior with warm lighting and tasteful furnishings.',
  custom: '',
};

const LIGHTING_DESCRIPTORS: Record<LightingPreset, string> = {
  studio: 'Professional studio lighting with key light and fill light. Clean, even illumination with soft shadows.',
  'golden-hour': 'Warm golden hour sunlight creating soft, warm tones and long shadows. Romantic and flattering.',
  overcast: 'Soft, diffused overcast lighting. Even illumination without harsh shadows. Natural and gentle.',
  flash: 'On-camera flash aesthetic creating a raw, editorial look with sharp contrast and vibrant colors.',
};

const BASE_INSTRUCTION =
  'Generate a photorealistic, high-resolution fashion lookbook photograph. The image should look like a professional commercial photograph, NOT an illustration or digital art.';

const QUALITY_SUFFIX =
  'Ultra high resolution, 8K quality, sharp focus, professional color grading, fashion magazine quality. Shot with a high-end DSLR camera with a 85mm lens.';

export function buildModelPrompt(params: ModelGenerationParams): string {
  const genderDesc = GENDER_DESCRIPTORS[params.gender];
  const ageDesc = AGE_DESCRIPTORS[params.ageRange].replace(
    'her/his',
    params.gender === 'female' ? 'her' : 'his',
  );
  const bodyDesc = BODY_TYPE_DESCRIPTORS[params.bodyType];
  const styleDesc = STYLE_DESCRIPTORS[params.style];
  const poseDesc = POSE_DESCRIPTORS[params.pose];
  const bgDesc =
    params.background === 'custom' && params.customBackground
      ? params.customBackground
      : BACKGROUND_DESCRIPTORS[params.background];
  const lightingDesc = LIGHTING_DESCRIPTORS[params.lighting];

  const ethnicityPart = params.ethnicity ? `, ${params.ethnicity} ethnicity` : '';
  const hairPart = [
    params.hairStyle ? `${params.hairStyle} hairstyle` : '',
    params.hairColor ? `${params.hairColor} hair color` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const hairDesc = hairPart ? ` with ${hairPart}` : '';

  const parts = [
    BASE_INSTRUCTION,
    '',
    `Subject: ${genderDesc} ${bodyDesc}, ${ageDesc}${ethnicityPart}${hairDesc}.`,
    '',
    `Style Direction: ${styleDesc}`,
    '',
    `Pose: ${poseDesc}`,
    '',
    `Background: ${bgDesc}`,
    '',
    `Lighting: ${lightingDesc}`,
    '',
    'The model should be wearing simple, neutral clothing (plain white t-shirt and black shorts) as the clothing will be swapped in a subsequent step. Focus on generating a realistic model with the correct body proportions, facial features, and pose.',
    '',
    QUALITY_SUFFIX,
  ];

  return parts.join('\n');
}

export function buildPresetModelPrompt(
  preset: StylePreset,
  gender: Gender = 'female',
  pose: PosePreset = 'standing-front',
  background: BackgroundPreset = 'studio-white',
): string {
  return buildModelPrompt({
    gender,
    bodyType: 'slim',
    ageRange: '20s',
    style: preset,
    pose,
    background,
    lighting: 'studio',
  });
}

export {
  GENDER_DESCRIPTORS,
  BODY_TYPE_DESCRIPTORS,
  AGE_DESCRIPTORS,
  STYLE_DESCRIPTORS,
  POSE_DESCRIPTORS,
  BACKGROUND_DESCRIPTORS,
  LIGHTING_DESCRIPTORS,
};
