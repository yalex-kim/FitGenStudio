import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI, { toFile } from 'openai';

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

const GPT_IMAGE_MODEL = 'gpt-image-2';
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

function getSize(framing?: string): '1024x1024' | '1024x1536' {
  if (framing === 'upper-body' || framing === 'close-up') return '1024x1024';
  return '1024x1536';
}

function buildVariationInstruction(data: VariationRequestBody): string {
  const bgDesc = data.background === 'custom' && data.customBackground
    ? data.customBackground
    : BG_DESC[data.background] || '';

  const hasReference = !!data.referenceImageBase64;
  const cameraAngle = data.cameraAngle || 'front';
  const framing = data.framing || 'full-body';

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
      "- Match the reference image's overall mood, camera angle, composition, and atmosphere.",
      '- Adapt the background and lighting to resemble the reference.',
      '- The pose should closely follow the reference while keeping the model natural.',
    );
  } else {
    lines.push('- Only change pose, background, and lighting as specified.');
  }

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
  const instruction = buildVariationInstruction(data);
  const size = getSize(data.framing);
  const client = new OpenAI({ apiKey });

  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)));
    }

    try {
      const modelMime = (data.modelMimeType || 'image/png') as 'image/png' | 'image/jpeg' | 'image/webp';
      const modelExt = modelMime === 'image/jpeg' ? 'jpg' : modelMime === 'image/webp' ? 'webp' : 'png';
      const modelFile = await toFile(
        Buffer.from(data.modelImageBase64, 'base64'),
        `model.${modelExt}`,
        { type: modelMime },
      );

      const images: Awaited<ReturnType<typeof toFile>>[] = [modelFile];

      if (data.referenceImageBase64) {
        const refMime = (data.referenceMimeType || 'image/jpeg') as 'image/png' | 'image/jpeg' | 'image/webp';
        const refExt = refMime === 'image/jpeg' ? 'jpg' : refMime === 'image/webp' ? 'webp' : 'png';
        const refFile = await toFile(
          Buffer.from(data.referenceImageBase64, 'base64'),
          `reference.${refExt}`,
          { type: refMime },
        );
        images.push(refFile);
      }

      const response = await client.images.edit({
        model: GPT_IMAGE_MODEL,
        image: images.length === 1 ? images[0] : images,
        prompt: instruction,
        n: 1,
        size,
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

  throw new Error(`Variation failed after ${MAX_RETRIES} attempts. Last: ${lastError}`);
}
