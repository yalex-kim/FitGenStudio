import type {
  GenerationResult,
  GenerationError,
} from '@/types/generation';

const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const REQUEST_TIMEOUT_MS = 60_000;

interface GeminiImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

interface GeminiTextPart {
  text: string;
}

type GeminiPart = GeminiImagePart | GeminiTextPart;

interface GeminiRequestBody {
  contents: Array<{
    parts: GeminiPart[];
  }>;
  generationConfig: {
    responseModalities: string[];
    temperature?: number;
    topP?: number;
  };
}

interface GeminiResponseCandidate {
  content: {
    parts: Array<{
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
      };
    }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiResponseCandidate[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!key) {
    throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
  }
  return key;
}

function createGenerationError(
  code: GenerationError['code'],
  message: string,
  retryable = false,
): GenerationError {
  return { code, message, retryable };
}

function classifyError(status: number, body?: GeminiResponse): GenerationError {
  if (status === 429) {
    return createGenerationError('RATE_LIMIT', 'API rate limit exceeded. Please try again later.', true);
  }
  if (status === 400 && body?.error?.message?.includes('safety')) {
    return createGenerationError('CONTENT_SAFETY', 'Content was blocked by safety filters.');
  }
  if (status === 400) {
    return createGenerationError('INVALID_INPUT', body?.error?.message ?? 'Invalid input parameters.');
  }
  if (status >= 500) {
    return createGenerationError('API_ERROR', 'Gemini API server error. Please try again.', true);
  }
  return createGenerationError('API_ERROR', body?.error?.message ?? `Unexpected error (HTTP ${status}).`, status >= 500);
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createGenerationError('TIMEOUT', `Request timed out after ${timeoutMs / 1000}s.`, true);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGeminiWithRetry(body: GeminiRequestBody): Promise<GenerationResult> {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  let lastError: GenerationError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      const jitter = Math.random() * backoff * 0.1;
      await new Promise((resolve) => setTimeout(resolve, backoff + jitter));
    }

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        REQUEST_TIMEOUT_MS,
      );

      if (!response.ok) {
        let errorBody: GeminiResponse | undefined;
        try {
          errorBody = (await response.json()) as GeminiResponse;
        } catch {
          // ignore JSON parse failure
        }
        lastError = classifyError(response.status, errorBody);
        if (!lastError.retryable) throw lastError;
        continue;
      }

      const data = (await response.json()) as GeminiResponse;

      if (!data.candidates?.length) {
        lastError = createGenerationError('API_ERROR', 'No candidates returned from Gemini API.', true);
        continue;
      }

      const candidate = data.candidates[0];
      const imagePart = candidate.content.parts.find((p) => p.inlineData);

      if (!imagePart?.inlineData) {
        lastError = createGenerationError('API_ERROR', 'No image data in Gemini response.', true);
        continue;
      }

      const promptText = body.contents[0].parts.find(
        (p): p is GeminiTextPart => 'text' in p,
      )?.text ?? '';

      return {
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
        promptUsed: promptText,
        timestamp: new Date().toISOString(),
        modelVersion: GEMINI_MODEL,
      };
    } catch (error) {
      if (isGenerationError(error)) {
        lastError = error;
        if (!error.retryable) throw error;
      } else {
        lastError = createGenerationError(
          'API_ERROR',
          error instanceof Error ? error.message : 'Unknown error occurred.',
          true,
        );
      }
    }
  }

  throw lastError ?? createGenerationError('API_ERROR', 'Max retries exceeded.');
}

function isGenerationError(error: unknown): error is GenerationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'retryable' in error
  );
}

/**
 * Generate a virtual model image from a text prompt.
 * Step 1 of the generation pipeline.
 */
export async function generateModel(prompt: string): Promise<GenerationResult> {
  const body: GeminiRequestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 1.0,
      topP: 0.95,
    },
  };

  return callGeminiWithRetry(body);
}

/**
 * Swap clothing onto a model image using a garment reference image.
 * Step 2 of the generation pipeline.
 */
export async function swapClothing(
  modelImageBase64: string,
  garmentImageBase64: string,
  instruction: string,
  modelMimeType = 'image/png',
  garmentMimeType = 'image/png',
): Promise<GenerationResult> {
  const body: GeminiRequestBody = {
    contents: [
      {
        parts: [
          { text: instruction },
          {
            inlineData: {
              mimeType: modelMimeType,
              data: modelImageBase64,
            },
          },
          {
            inlineData: {
              mimeType: garmentMimeType,
              data: garmentImageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.8,
      topP: 0.9,
    },
  };

  return callGeminiWithRetry(body);
}

/**
 * Generate a pose/background variation of an existing model image.
 * Step 2-B of the generation pipeline.
 */
export async function generateVariation(
  modelImageBase64: string,
  newPosePrompt: string,
  modelMimeType = 'image/png',
): Promise<GenerationResult> {
  const body: GeminiRequestBody = {
    contents: [
      {
        parts: [
          { text: newPosePrompt },
          {
            inlineData: {
              mimeType: modelMimeType,
              data: modelImageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.9,
      topP: 0.95,
    },
  };

  return callGeminiWithRetry(body);
}

export { isGenerationError, createGenerationError };
