import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

interface SwapRequestBody {
  modelImageBase64: string;
  garmentImageBase64: string;
  garmentCategory: string;
  modelMimeType?: string;
  garmentMimeType?: string;
  fitOptions?: {
    tuckIn?: boolean;
    sleeveRoll?: boolean;
    buttonOpen?: boolean;
    autoCoordination?: boolean;
  };
}

const VALID_CATEGORIES = ['tops', 'outerwear', 'bottoms', 'dresses', 'accessories'];
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_SIZE = 20 * 1024 * 1024 * 1.37; // ~20MB in base64

function validateBody(body: unknown): { valid: true; data: SwapRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required.' };
  }

  const b = body as Record<string, unknown>;

  if (!b.modelImageBase64 || typeof b.modelImageBase64 !== 'string') {
    return { valid: false, error: 'modelImageBase64 is required.' };
  }
  if (!b.garmentImageBase64 || typeof b.garmentImageBase64 !== 'string') {
    return { valid: false, error: 'garmentImageBase64 is required.' };
  }
  if ((b.modelImageBase64 as string).length > MAX_BASE64_SIZE) {
    return { valid: false, error: 'Model image exceeds 20MB limit.' };
  }
  if ((b.garmentImageBase64 as string).length > MAX_BASE64_SIZE) {
    return { valid: false, error: 'Garment image exceeds 20MB limit.' };
  }
  if (!b.garmentCategory || !VALID_CATEGORIES.includes(b.garmentCategory as string)) {
    return { valid: false, error: `Invalid garmentCategory. Must be one of: ${VALID_CATEGORIES.join(', ')}` };
  }
  if (b.modelMimeType && !VALID_MIME_TYPES.includes(b.modelMimeType as string)) {
    return { valid: false, error: `Invalid modelMimeType. Must be one of: ${VALID_MIME_TYPES.join(', ')}` };
  }
  if (b.garmentMimeType && !VALID_MIME_TYPES.includes(b.garmentMimeType as string)) {
    return { valid: false, error: `Invalid garmentMimeType. Must be one of: ${VALID_MIME_TYPES.join(', ')}` };
  }

  return { valid: true, data: body as SwapRequestBody };
}

const GEMINI_MODEL = 'gemini-3-pro-image-preview';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

const CATEGORY_INSTRUCTIONS: Record<string, string> = {
  tops: "Replace the model's top with the garment in the reference. Preserve exact fabric texture, color, pattern, logos, and prints.",
  outerwear: "Add or replace the outerwear on the model with the reference garment. Preserve all details: fabric, zippers, buttons, pockets, logos.",
  bottoms: "Replace the model's bottoms with the reference garment. Maintain exact fabric, wash, color, and pattern details.",
  dresses: "Replace the model's entire outfit with the dress in the reference. Preserve exact fabric, pattern, color, and construction.",
  accessories: "Add the reference accessory to the model's outfit naturally. Preserve all details, logos, and textures.",
};

const FIT_INSTRUCTIONS: Record<string, string> = {
  tuckIn: 'The top should be neatly tucked in.',
  sleeveRoll: 'Sleeves should be casually rolled up.',
  buttonOpen: 'Top buttons should be left casually unbuttoned.',
  autoCoordination: 'Coordinate the rest of the outfit to complement the garment.',
};

function buildSwapInstruction(data: SwapRequestBody): string {
  const fitParts: string[] = [];
  if (data.fitOptions) {
    for (const [key, value] of Object.entries(data.fitOptions)) {
      if (value && FIT_INSTRUCTIONS[key]) {
        fitParts.push(FIT_INSTRUCTIONS[key]);
      }
    }
  }

  const fitSection = fitParts.length > 0
    ? `\nStyling: ${fitParts.join(' ')}`
    : '';

  return [
    'Clothing swap for a fashion lookbook. First image = model. Second image = garment to apply.',
    '',
    'REQUIREMENTS:',
    "- Preserve model's face, skin tone, body, pose, and background exactly.",
    "- Preserve garment's exact appearance: texture, color, pattern, logos, prints.",
    '- Natural fit with realistic wrinkles, draping, shadows.',
    '- Matching scene lighting. Result must look like a real photograph.',
    '',
    `Garment: ${data.garmentCategory}. ${CATEGORY_INSTRUCTIONS[data.garmentCategory]}`,
    fitSection,
    '',
    'Output: photorealistic high-resolution fashion lookbook photo, ultra sharp, professional color grading.',
  ].join('\n');
}

async function callGeminiSwap(instruction: string, modelImg: string, garmentImg: string, modelMime: string, garmentMime: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const client = new GoogleGenAI({ apiKey });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)));
    }

    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{
          role: 'user',
          parts: [
            { text: instruction },
            { inlineData: { mimeType: modelMime, data: modelImg } },
            { inlineData: { mimeType: garmentMime, data: garmentImg } },
          ],
        }],
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
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
    const instruction = buildSwapInstruction(data);
    const modelMime = data.modelMimeType || 'image/png';
    const garmentMime = data.garmentMimeType || 'image/png';

    const result = await callGeminiSwap(
      instruction,
      data.modelImageBase64,
      data.garmentImageBase64,
      modelMime,
      garmentMime,
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

    console.error('Clothing swap error:', error);
    return res.status(500).json({ error: 'Internal server error during clothing swap.' });
  }
}
