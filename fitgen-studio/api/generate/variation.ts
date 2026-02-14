import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

interface VariationRequestBody {
  modelImageBase64: string;
  modelMimeType?: string;
  referenceImageBase64?: string;
  referenceMimeType?: string;
  pose: string;
  background: string;
  lighting: string;
  cameraAngle?: string;
  framing?: string;
  customBackground?: string;
}

const VALID_POSES = [
  'standing-front', 'standing-three-quarter', 'standing-side', 'walking', 'seated', 'dynamic',
  'standing', 'running', 'leaning',
];
const VALID_CAMERA_ANGLES = ['front', 'three-quarter', 'side', 'low-angle', 'high-angle', 'over-shoulder'];
const VALID_FRAMINGS = ['full-body', 'three-quarter-body', 'upper-body', 'close-up'];
const VALID_BACKGROUNDS = [
  'studio-white', 'studio-gray', 'studio-colored',
  'outdoor-park', 'outdoor-street', 'outdoor-urban', 'outdoor-nature',
  'lifestyle-cafe', 'lifestyle-office', 'lifestyle-home', 'custom',
];
const VALID_LIGHTINGS = ['studio', 'golden-hour', 'overcast', 'flash'];
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_SIZE = 20 * 1024 * 1024 * 1.37;

function validateBody(body: unknown): { valid: true; data: VariationRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required.' };
  }

  const b = body as Record<string, unknown>;

  if (!b.modelImageBase64 || typeof b.modelImageBase64 !== 'string') {
    return { valid: false, error: 'modelImageBase64 is required.' };
  }
  if ((b.modelImageBase64 as string).length > MAX_BASE64_SIZE) {
    return { valid: false, error: 'Model image exceeds 20MB limit.' };
  }
  if (b.modelMimeType && !VALID_MIME_TYPES.includes(b.modelMimeType as string)) {
    return { valid: false, error: `Invalid modelMimeType. Must be one of: ${VALID_MIME_TYPES.join(', ')}` };
  }
  if (!b.pose || !VALID_POSES.includes(b.pose as string)) {
    return { valid: false, error: `Invalid pose. Must be one of: ${VALID_POSES.join(', ')}` };
  }
  if (b.cameraAngle && !VALID_CAMERA_ANGLES.includes(b.cameraAngle as string)) {
    return { valid: false, error: `Invalid cameraAngle. Must be one of: ${VALID_CAMERA_ANGLES.join(', ')}` };
  }
  if (b.framing && !VALID_FRAMINGS.includes(b.framing as string)) {
    return { valid: false, error: `Invalid framing. Must be one of: ${VALID_FRAMINGS.join(', ')}` };
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
  if (b.referenceImageBase64 && typeof b.referenceImageBase64 === 'string') {
    if ((b.referenceImageBase64 as string).length > MAX_BASE64_SIZE) {
      return { valid: false, error: 'Reference image exceeds 20MB limit.' };
    }
  }
  if (b.referenceMimeType && !VALID_MIME_TYPES.includes(b.referenceMimeType as string)) {
    return { valid: false, error: `Invalid referenceMimeType. Must be one of: ${VALID_MIME_TYPES.join(', ')}` };
  }

  return { valid: true, data: body as VariationRequestBody };
}

const GEMINI_MODEL = 'gemini-3-pro-image-preview';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

const POSE_DESC: Record<string, string> = {
  standing: 'Standing naturally, balanced posture.',
  'standing-front': 'Standing facing camera directly, arms relaxed.',
  'standing-three-quarter': 'Standing at 3/4 angle to camera.',
  'standing-side': 'Standing in profile view, head slightly toward camera.',
  walking: 'Mid-stride walking pose, natural arm swing.',
  running: 'Running pose with dynamic leg and arm movement.',
  seated: 'Seated with upright posture.',
  dynamic: 'Expressive fashion editorial pose with movement.',
  leaning: 'Leaning casually against a surface, relaxed posture.',
};

const CAMERA_ANGLE_DESC: Record<string, string> = {
  front: 'Shot straight on from the front, eye level.',
  'three-quarter': 'Shot from a 3/4 angle to the subject.',
  side: 'Shot from the side, profile view.',
  'low-angle': 'Shot from a low angle looking up.',
  'high-angle': 'Shot from a high angle looking down.',
  'over-shoulder': 'Shot from over the shoulder.',
};

const FRAMING_DESC: Record<string, string> = {
  'full-body': 'Full body visible from head to toe.',
  'three-quarter-body': '3/4 body framing, visible from head to just above the knees.',
  'upper-body': 'Upper body framing, visible from the waist up.',
  'close-up': 'Close-up framing, visible from the chest up.',
};

const BG_DESC: Record<string, string> = {
  'studio-white': 'Clean white seamless studio background.',
  'studio-gray': 'Neutral gray seamless studio background.',
  'studio-colored': 'Pastel-colored seamless studio background.',
  'outdoor-park': 'Lush green park with natural sunlight.',
  'outdoor-street': 'Urban city street with architecture.',
  'outdoor-urban': 'Modern urban landscape with glass buildings.',
  'outdoor-nature': 'Natural setting with open sky.',
  'lifestyle-cafe': 'Stylish cafe interior with warm lighting.',
  'lifestyle-office': 'Modern minimalist office with window light.',
  'lifestyle-home': 'Cozy home interior with warm lighting.',
};

const LIGHT_DESC: Record<string, string> = {
  studio: 'Professional studio lighting, clean and even.',
  'golden-hour': 'Warm golden hour sunlight, soft tones.',
  overcast: 'Soft diffused overcast lighting.',
  flash: 'On-camera flash editorial look.',
};

function buildVariationInstruction(data: VariationRequestBody): string {
  const bgDesc = data.background === 'custom' && data.customBackground
    ? data.customBackground
    : BG_DESC[data.background] || '';

  const hasReference = !!data.referenceImageBase64;

  const lines = [
    hasReference
      ? 'Generate a variation of the model (first image) matching the mood, pose, and atmosphere of the reference image (second image).'
      : 'Generate a pose/background variation of the model in the provided image.',
    '',
    'REQUIREMENTS:',
    '- SAME person: identical face, skin tone, hair, body proportions.',
    '- Keep the same clothing/outfit.',
  ];

  if (hasReference) {
    lines.push(
      '- Match the reference image\'s overall mood, camera angle, composition, and atmosphere.',
      '- Adapt the background and lighting to resemble the reference.',
      '- The pose should closely follow the reference while keeping the model natural.',
    );
  } else {
    lines.push('- Only change pose, background, and lighting as specified.');
  }

  const cameraAngle = data.cameraAngle || 'front';
  const framing = data.framing || 'full-body';

  lines.push(
    '- Result should look like a real photograph from the same session.',
    '',
    `Pose: ${POSE_DESC[data.pose] || POSE_DESC['standing']}`,
    `Camera Angle: ${CAMERA_ANGLE_DESC[cameraAngle] || CAMERA_ANGLE_DESC['front']}`,
    `Framing: ${FRAMING_DESC[framing] || FRAMING_DESC['full-body']}`,
    `Background: ${bgDesc}`,
    `Lighting: ${LIGHT_DESC[data.lighting]}`,
    '',
    'Output: photorealistic high-resolution fashion lookbook photo, ultra sharp, professional color grading.',
  );

  return lines.join('\n');
}

async function callGeminiVariation(
  instruction: string,
  modelImg: string,
  modelMime: string,
  refImg?: string,
  refMime?: string,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const client = new GoogleGenAI({ apiKey });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)));
    }

    try {
      const inputParts: Array<Record<string, unknown>> = [
        { text: instruction },
        { inlineData: { mimeType: modelMime, data: modelImg } },
      ];
      if (refImg) {
        inputParts.push({ inlineData: { mimeType: refMime || 'image/jpeg', data: refImg } });
      }

      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{
          role: 'user',
          parts: inputParts,
        }],
      });

      const responseParts = response.candidates?.[0]?.content?.parts;
      if (!responseParts) continue;

      for (const part of responseParts) {
        if (part.inlineData && part.inlineData.data) {
          return {
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
            promptUsed: instruction,
            timestamp: new Date().toISOString(),
            modelVersion: GEMINI_MODEL,
          };
        }
      }

      continue;
    } catch (e: any) {
      if (e?.status === 429 && attempt < MAX_RETRIES - 1) continue;
      if (e?.status >= 500 && attempt < MAX_RETRIES - 1) continue;
      throw e;
    }
  }

  throw new Error('Max retries exceeded');
}

// Simple in-memory rate limiting per user/IP
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
    const { data } = validation;
    const instruction = buildVariationInstruction(data);
    const modelMime = data.modelMimeType || 'image/png';

    const result = await callGeminiVariation(
      instruction,
      data.modelImageBase64,
      modelMime,
      data.referenceImageBase64,
      data.referenceMimeType,
    );

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

    console.error('Variation generation error:', error);
    return res.status(500).json({ error: 'Internal server error during variation generation.' });
  }
}
