import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the API route handlers by dynamically importing them
// and mocking the VercelRequest/VercelResponse interface

function createMockRequest(method: string, body?: unknown) {
  return {
    method,
    body,
    headers: {},
  };
}

function createMockResponse() {
  const res: Record<string, unknown> = {};
  const jsonFn = vi.fn().mockReturnValue(res);
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  res.status = statusFn;
  res.json = jsonFn;
  return { res, statusFn, jsonFn };
}

describe('API Route: /api/generate/model', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any;

  beforeEach(async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const mod = await import('../../api/generate/model');
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should reject non-POST methods', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(createMockRequest('GET'), res);
    expect(statusFn).toHaveBeenCalledWith(405);
    expect(jsonFn).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('should reject empty body', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(createMockRequest('POST', null), res);
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  it('should reject invalid gender', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        gender: 'invalid',
        bodyType: 'slim',
        ageRange: '20s',
        style: 'chic',
        pose: 'standing-front',
        background: 'studio-white',
        lighting: 'studio',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('gender') }));
  });

  it('should reject invalid bodyType', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        gender: 'female',
        bodyType: 'invalid',
        ageRange: '20s',
        style: 'chic',
        pose: 'standing-front',
        background: 'studio-white',
        lighting: 'studio',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('bodyType') }));
  });

  it('should require customBackground when background is custom', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        gender: 'female',
        bodyType: 'slim',
        ageRange: '20s',
        style: 'chic',
        pose: 'standing-front',
        background: 'custom',
        lighting: 'studio',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('customBackground') }));
  });
});

describe('API Route: /api/generate/swap', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any;

  beforeEach(async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const mod = await import('../../api/generate/swap');
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should reject non-POST methods', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(createMockRequest('GET'), res);
    expect(statusFn).toHaveBeenCalledWith(405);
    expect(jsonFn).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('should reject missing modelImageBase64', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        garmentImageBase64: 'abc',
        garmentCategory: 'tops',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('modelImageBase64') }));
  });

  it('should reject missing garmentImageBase64', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        modelImageBase64: 'abc',
        garmentCategory: 'tops',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('garmentImageBase64') }));
  });

  it('should reject invalid garmentCategory', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        modelImageBase64: 'abc',
        garmentImageBase64: 'def',
        garmentCategory: 'invalid',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('garmentCategory') }));
  });

  it('should reject invalid mimeType', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        modelImageBase64: 'abc',
        garmentImageBase64: 'def',
        garmentCategory: 'tops',
        modelMimeType: 'application/pdf',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('modelMimeType') }));
  });
});

describe('API Route: /api/generate/variation', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any;

  beforeEach(async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const mod = await import('../../api/generate/variation');
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should reject non-POST methods', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(createMockRequest('GET'), res);
    expect(statusFn).toHaveBeenCalledWith(405);
    expect(jsonFn).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('should reject missing modelImageBase64', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        pose: 'walking',
        background: 'studio-white',
        lighting: 'studio',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('modelImageBase64') }));
  });

  it('should reject invalid pose', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        modelImageBase64: 'abc',
        pose: 'flying',
        background: 'studio-white',
        lighting: 'studio',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('pose') }));
  });
});

describe('API Route: /api/upscale', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: any;

  beforeEach(async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const mod = await import('../../api/upscale');
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should reject non-POST methods', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(createMockRequest('GET'), res);
    expect(statusFn).toHaveBeenCalledWith(405);
    expect(jsonFn).toHaveBeenCalledWith({ error: 'Method not allowed' });
  });

  it('should reject missing imageBase64', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(createMockRequest('POST', {}), res);
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('imageBase64') }));
  });

  it('should reject invalid mimeType', async () => {
    const { res, statusFn, jsonFn } = createMockResponse();
    await handler(
      createMockRequest('POST', {
        imageBase64: 'abc',
        mimeType: 'text/plain',
      }),
      res,
    );
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('mimeType') }));
  });
});
