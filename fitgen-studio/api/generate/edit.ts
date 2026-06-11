import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI, { toFile } from 'openai';

interface EditRequestBody {
  imageBase64: string;
  imageMimeType?: string;
  editType: 'background' | 'shoes' | 'custom';
  editInstruction: string;
}

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_SIZE = 20 * 1024 * 1024 * 1.37;

const GPT_IMAGE_MODEL = 'gpt-image-2';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

function validateBody(body: unknown): { valid: true; data: EditRequestBody } | { valid: false; error: string } {
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
  if (b.imageMimeType && !VALID_MIME_TYPES.includes(b.imageMimeType as string)) {
    return { valid: false, error: `Invalid imageMimeType. Must be one of: ${VALID_MIME_TYPES.join(', ')}` };
  }
  const validEditTypes = ['background', 'shoes', 'custom'];
  if (!b.editType || !validEditTypes.includes(b.editType as string)) {
    return { valid: false, error: `Invalid editType. Must be one of: ${validEditTypes.join(', ')}` };
  }
  if (!b.editInstruction || typeof b.editInstruction !== 'string' || (b.editInstruction as string).trim().length === 0) {
    return { valid: false, error: 'editInstruction is required.' };
  }

  return { valid: true, data: body as EditRequestBody };
}

function buildEditPrompt(data: EditRequestBody): string {
  const lines = [
    'Edit the provided image according to the instruction below.',
    '',
    'CRITICAL REQUIREMENTS:',
    '- Keep the person, their face, skin tone, hair, and body proportions EXACTLY the same.',
    '- Keep all clothing and accessories EXACTLY the same, UNLESS the edit instruction specifically asks to change them.',
    '- Keep the pose and body position EXACTLY the same.',
    '- Only change what the instruction asks for. Nothing else.',
    '- The result should look like a real photograph, photorealistic quality.',
    '',
  ];

  if (data.editType === 'background') {
    lines.push(
      'EDIT TYPE: Background Change',
      `INSTRUCTION: Change the background to: ${data.editInstruction}`,
      '',
      'Keep the person and all clothing identical. Only replace the background environment.',
    );
  } else if (data.editType === 'shoes') {
    lines.push(
      'EDIT TYPE: Shoes/Footwear Change',
      `INSTRUCTION: Change the shoes/footwear to: ${data.editInstruction}`,
      '',
      'Keep the person, pose, background, and all other clothing identical. Only change the footwear.',
    );
  } else {
    lines.push(
      'EDIT TYPE: Custom Edit',
      `INSTRUCTION: ${data.editInstruction}`,
    );
  }

  lines.push(
    '',
    'Output: photorealistic high-resolution fashion photo, ultra sharp, professional quality.',
  );

  return lines.join('\n');
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
  const mimeType = (data.imageMimeType || 'image/png') as 'image/png' | 'image/jpeg' | 'image/webp';
  const prompt = buildEditPrompt(data);
  const client = new OpenAI({ apiKey });

  let lastError = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)));
    }

    try {
      const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
      const imageBuffer = Buffer.from(data.imageBase64, 'base64');
      const imageFile = await toFile(imageBuffer, `image.${ext}`, { type: mimeType });

      const response = await client.images.edit({
        model: GPT_IMAGE_MODEL,
        image: imageFile,
        prompt,
        n: 1,
        size: '1024x1024',
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

  throw new Error(`Edit failed after ${MAX_RETRIES} attempts. Last: ${lastError}`);
}
