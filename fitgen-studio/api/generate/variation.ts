import type { VercelRequest, VercelResponse } from '@vercel/node';

interface VariationRequestBody {
  modelImageBase64: string;
  modelMimeType?: string;
  pose: string;
  background: string;
  lighting: string;
  customBackground?: string;
}

const VALID_POSES = ['standing-front', 'standing-three-quarter', 'standing-side', 'walking', 'seated', 'dynamic'];
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
  if (!b.background || !VALID_BACKGROUNDS.includes(b.background as string)) {
    return { valid: false, error: `Invalid background. Must be one of: ${VALID_BACKGROUNDS.join(', ')}` };
  }
  if (!b.lighting || !VALID_LIGHTINGS.includes(b.lighting as string)) {
    return { valid: false, error: `Invalid lighting. Must be one of: ${VALID_LIGHTINGS.join(', ')}` };
  }
  if (b.background === 'custom' && (!b.customBackground || typeof b.customBackground !== 'string')) {
    return { valid: false, error: 'customBackground is required when background is "custom".' };
  }

  return { valid: true, data: body as VariationRequestBody };
}

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const REQUEST_TIMEOUT_MS = 60_000;

const POSE_DESC: Record<string, string> = {
  'standing-front': 'Standing facing camera directly, arms relaxed, full body visible.',
  'standing-three-quarter': 'Standing at 3/4 angle to camera, full body visible.',
  'standing-side': 'Standing in profile view, head slightly toward camera, full body visible.',
  walking: 'Mid-stride walking pose, natural arm swing, full body visible.',
  seated: 'Seated with upright posture, full body visible.',
  dynamic: 'Expressive fashion editorial pose with movement, full body visible.',
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

  return [
    'Generate a pose/background variation of the model in the provided image.',
    '',
    'REQUIREMENTS:',
    '- SAME person: identical face, skin tone, hair, body proportions.',
    '- Keep the same clothing/outfit.',
    '- Only change pose, background, and lighting as specified.',
    '- Result should look like a real photograph from the same session.',
    '',
    `New Pose: ${POSE_DESC[data.pose]}`,
    `New Background: ${bgDesc}`,
    `Lighting: ${LIGHT_DESC[data.lighting]}`,
    '',
    'Output: photorealistic high-resolution fashion lookbook photo, ultra sharp, professional color grading.',
  ].join('\n');
}

async function callGeminiVariation(instruction: string, modelImg: string, modelMime: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{
      parts: [
        { text: instruction },
        { inlineData: { mimeType: modelMime, data: modelImg } },
      ],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.9,
      topP: 0.95,
    },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.status === 429) continue;
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status >= 500) continue;
        throw { status: res.status, body: err };
      }

      const data = await res.json();
      const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (!imagePart?.inlineData) continue;

      return {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
        promptUsed: instruction,
        timestamp: new Date().toISOString(),
        modelVersion: GEMINI_MODEL,
      };
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.status) throw e;
      if (attempt === MAX_RETRIES - 1) throw e;
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

    const result = await callGeminiVariation(instruction, data.modelImageBase64, modelMime);

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
