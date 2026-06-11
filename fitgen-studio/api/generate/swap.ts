import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI, { toFile } from 'openai';

interface GarmentEntry {
  imageBase64: string;
  mimeType?: string;
  category: string;
}

interface SwapRequestBody {
  modelImageBase64: string;
  modelMimeType?: string;
  // Single garment (backwards-compatible)
  garmentImageBase64?: string;
  garmentCategory?: string;
  garmentMimeType?: string;
  // Multi garment
  garments?: GarmentEntry[];
  fitOptions?: {
    tuckIn?: boolean;
    sleeveRoll?: boolean;
    buttonOpen?: boolean;
    autoCoordination?: boolean;
  };
}

const VALID_CATEGORIES = ['tops', 'outerwear', 'bottoms', 'dresses', 'accessories'];
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_SIZE = 20 * 1024 * 1024 * 1.37;

function normalizeGarments(data: SwapRequestBody): GarmentEntry[] {
  if (data.garments && data.garments.length > 0) return data.garments;
  if (data.garmentImageBase64 && data.garmentCategory) {
    return [{
      imageBase64: data.garmentImageBase64,
      mimeType: data.garmentMimeType,
      category: data.garmentCategory,
    }];
  }
  return [];
}

function validateBody(body: unknown): { valid: true; data: SwapRequestBody } | { valid: false; error: string } {
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

  if (Array.isArray(b.garments)) {
    for (let i = 0; i < b.garments.length; i++) {
      const g = b.garments[i] as Record<string, unknown>;
      if (!g.imageBase64 || typeof g.imageBase64 !== 'string') {
        return { valid: false, error: `garments[${i}].imageBase64 is required.` };
      }
      if ((g.imageBase64 as string).length > MAX_BASE64_SIZE) {
        return { valid: false, error: `garments[${i}] image exceeds 20MB limit.` };
      }
      if (!g.category || !VALID_CATEGORIES.includes(g.category as string)) {
        return { valid: false, error: `garments[${i}].category is invalid. Must be one of: ${VALID_CATEGORIES.join(', ')}` };
      }
      if (g.mimeType && !VALID_MIME_TYPES.includes(g.mimeType as string)) {
        return { valid: false, error: `garments[${i}].mimeType is invalid.` };
      }
    }
  } else {
    if (!b.garmentImageBase64 || typeof b.garmentImageBase64 !== 'string') {
      return { valid: false, error: 'garmentImageBase64 or garments array is required.' };
    }
    if ((b.garmentImageBase64 as string).length > MAX_BASE64_SIZE) {
      return { valid: false, error: 'Garment image exceeds 20MB limit.' };
    }
    if (!b.garmentCategory || !VALID_CATEGORIES.includes(b.garmentCategory as string)) {
      return { valid: false, error: `Invalid garmentCategory. Must be one of: ${VALID_CATEGORIES.join(', ')}` };
    }
    if (b.garmentMimeType && !VALID_MIME_TYPES.includes(b.garmentMimeType as string)) {
      return { valid: false, error: `Invalid garmentMimeType. Must be one of: ${VALID_MIME_TYPES.join(', ')}` };
    }
  }

  return { valid: true, data: body as SwapRequestBody };
}

const GPT_IMAGE_MODEL = 'gpt-image-2';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

const CATEGORY_INSTRUCTIONS: Record<string, string> = {
  tops: "Replace the model's top with the garment in the reference. Preserve exact fabric texture, color, pattern, logos, and prints.",
  outerwear: 'Add or replace the outerwear on the model with the reference garment. Preserve all details: fabric, zippers, buttons, pockets, logos.',
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
  const garmentEntries = normalizeGarments(data);
  const isMulti = garmentEntries.length > 1;

  const fitParts: string[] = [];
  if (data.fitOptions) {
    for (const [key, value] of Object.entries(data.fitOptions)) {
      if (value && FIT_INSTRUCTIONS[key]) {
        fitParts.push(FIT_INSTRUCTIONS[key]);
      }
    }
  }

  const fitSection = fitParts.length > 0
    ? `\nStyling instructions: ${fitParts.join(' ')}`
    : '';

  const imageCount = 1 + garmentEntries.length;
  const imageListLines = ['- IMAGE 1 (first image): A fashion MODEL wearing some clothing.'];
  const taskLines: string[] = [];
  const categoryInstructionLines: string[] = [];

  garmentEntries.forEach((g, i) => {
    const imgNum = i + 2;
    imageListLines.push(`- IMAGE ${imgNum} (image ${imgNum}): A GARMENT product photo — ${g.category} item.`);
    taskLines.push(`Take the ${g.category} garment from IMAGE ${imgNum} and dress the model in it.`);
    if (CATEGORY_INSTRUCTIONS[g.category]) {
      categoryInstructionLines.push(`IMAGE ${imgNum} (${g.category}): ${CATEGORY_INSTRUCTIONS[g.category]}`);
    }
  });

  return [
    'You are a virtual try-on system for a fashion lookbook.',
    '',
    `I am providing ${imageCount} images:`,
    ...imageListLines,
    '',
    'YOUR TASK:',
    ...taskLines,
    ...categoryInstructionLines,
    '',
    'GARMENT PRESERVATION (HIGHEST PRIORITY):',
    "- The garment's fabric texture, weave pattern, and material must be PIXEL-PERFECT to the reference garment image.",
    '- Colors must match EXACTLY — no color shift, no brightness change, no saturation change.',
    '- ALL logos, brand marks, text, prints, embroidery, and graphic elements must be reproduced in their EXACT position, size, shape, color, and orientation.',
    '- Stitching details, seams, buttons, zippers, pockets, collars, cuffs, and hems must be IDENTICAL to the reference garment image.',
    '- Do NOT simplify, stylize, or reinterpret any design element of the garment.',
    '- This is a PRODUCT PHOTO for commercial use — the garment must be recognizable as the exact same product.',
    '',
    'CRITICAL RULES:',
    "1. The model's face, skin tone, hair, body shape, pose, and background must remain EXACTLY the same.",
    isMulti
      ? '2. ALL garments from the reference images MUST appear on the model simultaneously. You MUST change the clothing.'
      : '2. The garment from IMAGE 2 MUST appear on the model. You MUST change the clothing.',
    '3. Each garment must fit naturally on the model with realistic wrinkles, draping, and shadows.',
    '4. Lighting and color temperature must match the original scene.',
    '5. Do NOT simply return the original model image unchanged. The clothing MUST be different.',
    fitSection,
    '',
    'Output: a single photorealistic high-resolution fashion lookbook photo, ultra sharp, professional quality.',
  ].join('\n');
}

async function mimeToExt(mime: string): Promise<string> {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { data } = validation;
  const garmentEntries = normalizeGarments(data);
  if (garmentEntries.length === 0) {
    return res.status(400).json({ error: 'At least one garment is required.' });
  }

  const instruction = buildSwapInstruction(data);
  const client = new OpenAI({ apiKey });

  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)));
    }

    try {
      const modelMime = (data.modelMimeType || 'image/png') as 'image/png' | 'image/jpeg' | 'image/webp';
      const modelExt = await mimeToExt(modelMime);
      const modelFile = await toFile(
        Buffer.from(data.modelImageBase64, 'base64'),
        `model.${modelExt}`,
        { type: modelMime },
      );

      const garmentFiles = await Promise.all(
        garmentEntries.map(async (g) => {
          const mime = (g.mimeType || 'image/png') as 'image/png' | 'image/jpeg' | 'image/webp';
          const ext = await mimeToExt(mime);
          return toFile(Buffer.from(g.imageBase64, 'base64'), `garment_${g.category}.${ext}`, { type: mime });
        }),
      );

      // First image is model, rest are garments — gpt-image-2 supports up to 16 images
      const images = [modelFile, ...garmentFiles];

      const response = await client.images.edit({
        model: GPT_IMAGE_MODEL,
        image: images,
        prompt: instruction,
        n: 1,
        size: '1024x1536',
        quality: 'high',
        output_format: 'png',
        input_fidelity: 'high',
      });

      const imageBase64 = response.data?.[0]?.b64_json;
      if (!imageBase64) {
        lastError = `Attempt ${attempt + 1}: no image data in response`;
        continue;
      }

      return res.status(200).json({
        success: true,
        data: {
          imageBase64,
          mimeType: 'image/png',
          promptUsed: instruction,
          timestamp: new Date().toISOString(),
          modelVersion: GPT_IMAGE_MODEL,
        },
      });
    } catch (e: any) {
      lastError = `Attempt ${attempt + 1}: ${e?.message || e}`;
      if (e?.status === 429 && attempt < MAX_RETRIES - 1) continue;
      if (e?.status >= 500 && attempt < MAX_RETRIES - 1) continue;
      throw e;
    }
  }

  throw new Error(`Swap failed after ${MAX_RETRIES} attempts. Last: ${lastError}`);
}
