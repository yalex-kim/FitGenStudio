import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

interface ModelRequestBody {
  gender: string;
  bodyType: string;
  ageRange: string;
  style: string;
  pose: string;
  background: string;
  lighting: string;
  customBackground?: string;
  ethnicity?: string;
  hairStyle?: string;
  hairColor?: string;
}

const VALID_GENDERS = ['female', 'male'];
const VALID_BODY_TYPES = ['slim', 'athletic', 'plus-size'];
const VALID_AGE_RANGES = ['20s', '30s', '40s'];
const VALID_STYLES = ['lovely', 'chic', 'sporty', 'street'];
const VALID_POSES = ['standing-front', 'standing-three-quarter', 'standing-side', 'walking', 'seated', 'dynamic'];
const VALID_BACKGROUNDS = [
  'studio-white', 'studio-gray', 'studio-colored',
  'outdoor-park', 'outdoor-street', 'outdoor-urban', 'outdoor-nature',
  'lifestyle-cafe', 'lifestyle-office', 'lifestyle-home', 'custom',
];
const VALID_LIGHTINGS = ['studio', 'golden-hour', 'overcast', 'flash'];

function validateBody(body: unknown): { valid: true; data: ModelRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required.' };
  }

  const b = body as Record<string, unknown>;

  if (!b.gender || !VALID_GENDERS.includes(b.gender as string)) {
    return { valid: false, error: `Invalid gender. Must be one of: ${VALID_GENDERS.join(', ')}` };
  }
  if (!b.bodyType || !VALID_BODY_TYPES.includes(b.bodyType as string)) {
    return { valid: false, error: `Invalid bodyType. Must be one of: ${VALID_BODY_TYPES.join(', ')}` };
  }
  if (!b.ageRange || !VALID_AGE_RANGES.includes(b.ageRange as string)) {
    return { valid: false, error: `Invalid ageRange. Must be one of: ${VALID_AGE_RANGES.join(', ')}` };
  }
  if (!b.style || !VALID_STYLES.includes(b.style as string)) {
    return { valid: false, error: `Invalid style. Must be one of: ${VALID_STYLES.join(', ')}` };
  }
  if (!b.pose || !VALID_POSES.includes(b.pose as string)) {
    return { valid: false, error: `Invalid pose. Must be one of: ${VALID_POSES.join(', ')}` };
  }
  if (!b.background || !VALID_BACKGROUNDS.includes(b.background as string)) {
    return { valid: false, error: `Invalid background. Must be one of: ${VALID_BACKGROUNDS.join(', ')}` };
  }
  if (!b.lighting || !VALID_LIGHTINGS.includes(b.lighting as string)) {
    return { valid: false, error: `Invalid lighting. Must be one of: ${VALID_LIGHTINGS.join(', ')}` };
  }
  if (b.background === 'custom' && (!b.customBackground || typeof b.customBackground !== 'string')) {
    return { valid: false, error: 'customBackground is required when background is "custom".' };
  }

  return { valid: true, data: body as ModelRequestBody };
}

const GEMINI_MODEL = 'gemini-3-pro-image-preview';

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: '1:1' as const,
        imageSize: '1K' as const,
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error('No response from Gemini');
  }

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
        promptUsed: prompt,
        timestamp: new Date().toISOString(),
        modelVersion: GEMINI_MODEL,
      };
    }
  }

  throw new Error('No image data received from Gemini');
}

// Simplified prompt builder for serverless context
function buildPrompt(params: ModelRequestBody): string {
  const genderMap: Record<string, string> = { female: 'a beautiful female fashion model', male: 'a handsome male fashion model' };
  const bodyMap: Record<string, string> = { slim: 'slim, elegant build', athletic: 'athletic, toned build', 'plus-size': 'plus-size, curvy build' };
  const styleMap: Record<string, string> = {
    lovely: 'Soft, feminine aesthetic with warm pastel tones and gentle natural makeup.',
    chic: 'Sophisticated editorial style with sharp, polished appearance and bold confidence.',
    sporty: 'Active, energetic appearance with fresh-faced minimal makeup and dynamic body language.',
    street: 'Urban casual street fashion look with effortless cool and relaxed confidence.',
  };
  const poseMap: Record<string, string> = {
    'standing-front': 'Standing facing the camera directly, arms relaxed, full body visible.',
    'standing-three-quarter': 'Standing at a 3/4 angle to the camera, full body visible.',
    'standing-side': 'Standing in profile view, head slightly toward camera, full body visible.',
    walking: 'Mid-stride walking pose, natural arm swing, full body visible.',
    seated: 'Seated with upright posture, legs positioned attractively, full body visible.',
    dynamic: 'Expressive fashion editorial pose with movement and energy, full body visible.',
  };
  const bgMap: Record<string, string> = {
    'studio-white': 'Clean white seamless studio background.',
    'studio-gray': 'Neutral gray seamless studio background.',
    'studio-colored': 'Pastel-colored seamless studio background.',
    'outdoor-park': 'Lush green park setting with natural sunlight.',
    'outdoor-street': 'Urban city street with architecture and ambient light.',
    'outdoor-urban': 'Modern urban landscape with glass buildings.',
    'outdoor-nature': 'Beautiful natural setting with open sky.',
    'lifestyle-cafe': 'Stylish cafe interior with warm ambient lighting.',
    'lifestyle-office': 'Modern minimalist office with natural window light.',
    'lifestyle-home': 'Cozy home interior with warm lighting.',
    custom: params.customBackground || '',
  };
  const lightMap: Record<string, string> = {
    studio: 'Professional studio lighting, clean and even.',
    'golden-hour': 'Warm golden hour sunlight, soft tones.',
    overcast: 'Soft diffused overcast lighting.',
    flash: 'On-camera flash editorial look.',
  };

  const pronoun = params.gender === 'female' ? 'her' : 'his';
  const ethPart = params.ethnicity ? `, ${params.ethnicity} ethnicity` : '';
  const hairParts = [params.hairStyle, params.hairColor ? `${params.hairColor} hair` : ''].filter(Boolean).join(', ');
  const hairPart = hairParts ? ` with ${hairParts}` : '';

  return [
    'Generate a photorealistic, high-resolution fashion lookbook photograph. NOT an illustration.',
    '',
    `Subject: ${genderMap[params.gender]} with a ${bodyMap[params.bodyType]}, in ${pronoun} ${params.ageRange}${ethPart}${hairPart}.`,
    `Style: ${styleMap[params.style]}`,
    `Pose: ${poseMap[params.pose]}`,
    `Background: ${bgMap[params.background]}`,
    `Lighting: ${lightMap[params.lighting]}`,
    '',
    'The model should wear simple neutral clothing (plain white t-shirt and jeans). Focus on realistic body proportions, facial features, and pose.',
    '',
    'Ultra high resolution, 8K quality, sharp focus, professional color grading, fashion magazine quality. Shot with 85mm lens.',
  ].join('\n');
}

// Simple in-memory rate limiting per user/IP (resets on cold start)
const TIER_LIMITS: Record<string, number> = { free: 10, pro: 500, business: Infinity };
const usageCounts = new Map<string, { count: number; month: string }>();

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function checkRateLimit(userId: string, tier: string): { allowed: boolean; remaining: number } {
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  if (limit === Infinity) return { allowed: true, remaining: Infinity };

  const month = getCurrentMonth();
  const entry = usageCounts.get(userId);

  if (!entry || entry.month !== month) {
    usageCounts.set(userId, { count: 1, month });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit check
  const userId = (req.headers['x-user-id'] as string) || 'anonymous';
  const userTier = (req.headers['x-user-tier'] as string) || 'free';
  const rateCheck = checkRateLimit(userId, userTier);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Monthly generation limit exceeded. Please upgrade your plan.',
      remaining: 0,
    });
  }

  const validation = validateBody(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const prompt = buildPrompt(validation.data);
    const result = await callGemini(prompt);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error?.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    if (error?.status === 400) {
      return res.status(400).json({ error: error.body?.error?.message || 'Invalid request.' });
    }

    console.error('Model generation error:', error);
    return res.status(500).json({ error: 'Internal server error during model generation.' });
  }
}
