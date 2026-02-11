import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateModel, swapClothing, generateVariation, isGenerationError, createGenerationError } from './gemini';

const mockSuccessResponse = {
  candidates: [
    {
      content: {
        parts: [
          { text: 'Generated image' },
          {
            inlineData: {
              mimeType: 'image/png',
              data: 'base64imagedata',
            },
          },
        ],
      },
    },
  ],
};

function mockFetch(response: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  });
}

describe('gemini API client', () => {
  beforeEach(() => {
    // Set VITE_ env var via import.meta.env (vitest supports this)
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('generateModel', () => {
    it('should return generation result on success', async () => {
      vi.stubGlobal('fetch', mockFetch(mockSuccessResponse));

      const result = await generateModel('test prompt');
      expect(result.imageBase64).toBe('base64imagedata');
      expect(result.mimeType).toBe('image/png');
      expect(result.promptUsed).toBe('test prompt');
      expect(result.modelVersion).toBe('gemini-2.0-flash-exp');
      expect(result.timestamp).toBeDefined();
    });

    it('should include correct request body', async () => {
      const fetchMock = mockFetch(mockSuccessResponse);
      vi.stubGlobal('fetch', fetchMock);

      await generateModel('fashion model prompt');

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.contents[0].parts[0].text).toBe('fashion model prompt');
      expect(callBody.generationConfig.responseModalities).toEqual(['TEXT', 'IMAGE']);
      expect(callBody.generationConfig.temperature).toBe(1.0);
    });

    it('should throw on missing API key', async () => {
      vi.unstubAllEnvs();
      // Don't set VITE_GEMINI_API_KEY at all
      await expect(generateModel('test')).rejects.toThrow('VITE_GEMINI_API_KEY');
    });

    it('should throw non-retryable error on 400', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({ error: { code: 400, message: 'Bad request', status: 'INVALID_ARGUMENT' } }, 400),
      );

      try {
        await generateModel('test');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(isGenerationError(e)).toBe(true);
        if (isGenerationError(e)) {
          expect(e.code).toBe('INVALID_INPUT');
          expect(e.retryable).toBe(false);
        }
      }
    });

    it('should throw content safety error on safety block', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({ error: { code: 400, message: 'safety filter blocked', status: 'FAILED' } }, 400),
      );

      try {
        await generateModel('test');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(isGenerationError(e)).toBe(true);
        if (isGenerationError(e)) {
          expect(e.code).toBe('CONTENT_SAFETY');
        }
      }
    });

    it('should retry on rate limit (429) and eventually fail', async () => {
      const fetchMock = mockFetch(
        { error: { code: 429, message: 'Rate limited', status: 'RESOURCE_EXHAUSTED' } },
        429,
      );
      vi.stubGlobal('fetch', fetchMock);

      try {
        await generateModel('test');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(isGenerationError(e)).toBe(true);
        if (isGenerationError(e)) {
          expect(e.code).toBe('RATE_LIMIT');
          expect(e.retryable).toBe(true);
        }
      }
      // Should have retried 3 times
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should retry on 500 server error', async () => {
      const fetchMock = mockFetch({ error: { code: 500, message: 'Internal error' } }, 500);
      vi.stubGlobal('fetch', fetchMock);

      try {
        await generateModel('test');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(isGenerationError(e)).toBe(true);
      }
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should retry on missing candidates', async () => {
      const fetchMock = mockFetch({ candidates: [] });
      vi.stubGlobal('fetch', fetchMock);

      try {
        await generateModel('test');
        expect.unreachable('Should have thrown');
      } catch (e) {
        expect(isGenerationError(e)).toBe(true);
        if (isGenerationError(e)) {
          expect(e.message).toContain('No candidates');
        }
      }
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('swapClothing', () => {
    it('should include model and garment images in request', async () => {
      const fetchMock = mockFetch(mockSuccessResponse);
      vi.stubGlobal('fetch', fetchMock);

      await swapClothing('modelBase64', 'garmentBase64', 'swap instruction');

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const parts = callBody.contents[0].parts;
      expect(parts[0].text).toBe('swap instruction');
      expect(parts[1].inlineData.data).toBe('modelBase64');
      expect(parts[1].inlineData.mimeType).toBe('image/png');
      expect(parts[2].inlineData.data).toBe('garmentBase64');
    });

    it('should accept custom mime types', async () => {
      const fetchMock = mockFetch(mockSuccessResponse);
      vi.stubGlobal('fetch', fetchMock);

      await swapClothing('model', 'garment', 'swap', 'image/jpeg', 'image/webp');

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const parts = callBody.contents[0].parts;
      expect(parts[1].inlineData.mimeType).toBe('image/jpeg');
      expect(parts[2].inlineData.mimeType).toBe('image/webp');
    });

    it('should return generation result on success', async () => {
      vi.stubGlobal('fetch', mockFetch(mockSuccessResponse));

      const result = await swapClothing('model', 'garment', 'instruction');
      expect(result.imageBase64).toBe('base64imagedata');
      expect(result.mimeType).toBe('image/png');
    });
  });

  describe('generateVariation', () => {
    it('should include model image and new pose prompt', async () => {
      const fetchMock = mockFetch(mockSuccessResponse);
      vi.stubGlobal('fetch', fetchMock);

      await generateVariation('modelBase64', 'new walking pose');

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const parts = callBody.contents[0].parts;
      expect(parts[0].text).toBe('new walking pose');
      expect(parts[1].inlineData.data).toBe('modelBase64');
    });

    it('should return generation result', async () => {
      vi.stubGlobal('fetch', mockFetch(mockSuccessResponse));

      const result = await generateVariation('model', 'new pose');
      expect(result.imageBase64).toBe('base64imagedata');
    });
  });

  describe('isGenerationError', () => {
    it('should return true for generation errors', () => {
      const error = createGenerationError('API_ERROR', 'test', true);
      expect(isGenerationError(error)).toBe(true);
    });

    it('should return false for plain objects', () => {
      expect(isGenerationError({ message: 'test' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isGenerationError(null)).toBe(false);
    });

    it('should return false for strings', () => {
      expect(isGenerationError('error')).toBe(false);
    });
  });

  describe('createGenerationError', () => {
    it('should create error with correct shape', () => {
      const error = createGenerationError('TIMEOUT', 'timed out', true);
      expect(error).toEqual({
        code: 'TIMEOUT',
        message: 'timed out',
        retryable: true,
      });
    });

    it('should default retryable to false', () => {
      const error = createGenerationError('INVALID_INPUT', 'bad input');
      expect(error.retryable).toBe(false);
    });
  });
});
