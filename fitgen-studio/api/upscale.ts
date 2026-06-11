import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI, { toFile } from 'openai';

interface UpscaleRequestBody {
  imageBase64: string;
  mimeType?: string;
  scaleFactor?: number;
}

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_SIZE = 20 * 1024 * 1024 * 1.37;

const GPT_IMAGE_MODEL = 'gpt-image-2';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

function validateBody(body: unknown): { valid: true; data: UpscaleRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required.' };
  }

  const b = body as Record<string, unknown>;

  if (!b.imageBase64 || typeof b.imageBase64 !== 'string') {
    return { valid: false, error: 'imageBase64 is required.' };
  }
  if ((b.imageBase64 as string).length > MAX_BASE64_SIZE) {
    return { valid: false, error: 'Image exceeds 20MB limit.' };
  }
  if (b.mimeType && !VALID_MIME_TYPES.includes(b.mimeType as string)) {
    return { valid: false, error: `Invalid mimeType. Must be one of: ${VALID_MIME_TYPES.join(', ')}` };
  }

  return { valid: true, data: body as UpscaleRequestBody };
}

function buildUpscalePrompt(scaleFactor: number): string {
  return [
    `Upscale this image to ${scaleFactor}x higher resolution while maintaining all details.`,
    '',
    'REQUIREMENTS:',
    '- Enhance resolution and sharpness significantly.',
    '- Preserve all original details: textures, colors, patterns, facial features.',
    '- Do NOT change the composition, content, or style of the image.',
    '- Do NOT add any new elements or modify existing ones.',
    '- Maintain natural skin textures and fabric details.',
    '- Remove any compression artifacts from the original.',
    '',
    'Output the highest quality, sharpest version of this image possible.',
  ].join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
  const mimeType = (data.mimeType || 'image/png') as 'image/png' | 'image/jpeg' | 'image/webp';
  const scaleFactor = data.scaleFactor || 4;
  const prompt = buildUpscalePrompt(scaleFactor);
  const client = new OpenAI({ apiKey });

  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)));
    }

    try {
      const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
      const imageFile = await toFile(
        Buffer.from(data.imageBase64, 'base64'),
        `image.${ext}`,
        { type: mimeType },
      );

      const response = await client.images.edit({
        model: GPT_IMAGE_MODEL,
        image: imageFile,
        prompt,
        n: 1,
        size: '1536x1024',
        quality: 'high',
        output_format: 'png',
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

  throw new Error(`Upscale failed after ${MAX_RETRIES} attempts. Last: ${lastError}`);
}
