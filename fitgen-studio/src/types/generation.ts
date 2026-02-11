// Generation-related types for FitGen Studio

export type Gender = 'female' | 'male';
export type BodyType = 'slim' | 'athletic' | 'plus-size';
export type AgeRange = '20s' | '30s' | '40s';
export type StylePreset = 'lovely' | 'chic' | 'sporty' | 'street';
export type PosePreset =
  | 'standing-front'
  | 'standing-three-quarter'
  | 'standing-side'
  | 'walking'
  | 'seated'
  | 'dynamic';
export type BackgroundPreset =
  | 'studio-white'
  | 'studio-gray'
  | 'studio-colored'
  | 'outdoor-park'
  | 'outdoor-street'
  | 'outdoor-urban'
  | 'outdoor-nature'
  | 'lifestyle-cafe'
  | 'lifestyle-office'
  | 'lifestyle-home'
  | 'custom';
export type LightingPreset = 'studio' | 'golden-hour' | 'overcast' | 'flash';
export type GarmentCategory = 'tops' | 'outerwear' | 'bottoms' | 'dresses' | 'accessories';

export interface ModelGenerationParams {
  gender: Gender;
  bodyType: BodyType;
  ageRange: AgeRange;
  style: StylePreset;
  pose: PosePreset;
  background: BackgroundPreset;
  lighting: LightingPreset;
  customBackground?: string;
  ethnicity?: string;
  hairStyle?: string;
  hairColor?: string;
}

export interface ClothingSwapParams {
  modelImageBase64: string;
  garmentImageBase64: string;
  garmentCategory: GarmentCategory;
  fitOptions?: FitOptions;
}

export interface FitOptions {
  tuckIn?: boolean;
  sleeveRoll?: boolean;
  buttonOpen?: boolean;
  autoCoordination?: boolean;
}

export interface VariationParams {
  modelImageBase64: string;
  pose: PosePreset;
  background: BackgroundPreset;
  lighting: LightingPreset;
  customBackground?: string;
}

export interface GenerationResult {
  imageBase64: string;
  mimeType: string;
  promptUsed: string;
  timestamp: string;
  modelVersion: string;
}

export interface GenerationError {
  code: 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_INPUT' | 'API_ERROR' | 'CONTENT_SAFETY';
  message: string;
  retryable: boolean;
}
