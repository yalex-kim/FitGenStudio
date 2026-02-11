import type { VercelRequest, VercelResponse } from '@vercel/node';

interface UpscaleRequestBody {
  imageBase64: string;
  mimeType?: string;
  scaleFactor?: number;
}

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_SIZE = 20 * 1024 * 1024 * 1.37;

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const REQUEST_TIMEOUT_MS = 60_000;

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

async function callGeminiUpscale(imageBase64: string, mimeType: string, scaleFactor: number) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const prompt = buildUpscalePrompt(scaleFactor);

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.4,
      topP: 0.8,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const validation = validateBody(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const { data } = validation;
    const mimeType = data.mimeType || 'image/png';
    const scaleFactor = data.scaleFactor || 4;

    const result = await callGeminiUpscale(data.imageBase64, mimeType, scaleFactor);

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

    console.error('Upscale error:', error);
    return res.status(500).json({ error: 'Internal server error during image upscaling.' });
  }
}
