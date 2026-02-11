import { describe, it, expect, vi } from "vitest";
import {
  shouldApplyVisibleWatermark,
  applyVisibleWatermark,
  applyInvisibleWatermark,
  extractInvisibleWatermark,
  type WatermarkMetadata,
} from "./watermark";

describe("shouldApplyVisibleWatermark", () => {
  it("returns true for free tier", () => {
    expect(shouldApplyVisibleWatermark("free")).toBe(true);
  });

  it("returns false for pro tier", () => {
    expect(shouldApplyVisibleWatermark("pro")).toBe(false);
  });

  it("returns false for business tier", () => {
    expect(shouldApplyVisibleWatermark("business")).toBe(false);
  });
});

describe("applyVisibleWatermark", () => {
  it("calls canvas context drawing methods for watermark text", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      rotate: vi.fn(),
      font: "",
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      textAlign: "",
      textBaseline: "",
    };

    const canvas = {
      width: 200,
      height: 200,
      getContext: vi.fn(() => mockCtx),
    } as unknown as HTMLCanvasElement;

    applyVisibleWatermark(canvas);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
    expect(mockCtx.rotate).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalled();
    expect(mockCtx.strokeText).toHaveBeenCalled();

    // Verify watermark text content
    const firstFillTextCall = mockCtx.fillText.mock.calls[0];
    expect(firstFillTextCall[0]).toBe("FitGen Studio");
  });

  it("does nothing if canvas has no 2d context", () => {
    const canvas = {
      width: 200,
      height: 200,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    expect(() => applyVisibleWatermark(canvas)).not.toThrow();
  });
});

describe("invisible watermark (steganographic)", () => {
  const metadata: WatermarkMetadata = {
    userId: "user-123",
    imageId: "img-456",
    timestamp: 1700000000,
  };

  function createTestImageData(width = 200, height = 200) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i++) {
      data[i] = 128;
    }
    return { data, width, height } as ImageData;
  }

  it("embeds and extracts metadata correctly", () => {
    const imageData = createTestImageData();
    applyInvisibleWatermark(imageData, metadata);

    const extracted = extractInvisibleWatermark(imageData);
    expect(extracted).not.toBeNull();
    expect(extracted!.userId).toBe("user-123");
    expect(extracted!.imageId).toBe("img-456");
    expect(extracted!.timestamp).toBe(1700000000);
  });

  it("returns null for image data without watermark", () => {
    const imageData = createTestImageData();
    // All blue channel LSBs are 0 (since 128 is even)
    // The length header will read as 0, which fails the > 0 check
    const extracted = extractInvisibleWatermark(imageData);
    expect(extracted).toBeNull();
  });

  it("does not visibly alter pixel values (max 1 bit change in blue channel)", () => {
    const imageData = createTestImageData(20, 20);
    const originalBlues = new Uint8ClampedArray(20 * 20);
    for (let i = 2, j = 0; i < imageData.data.length; i += 4, j++) {
      originalBlues[j] = imageData.data[i];
    }

    applyInvisibleWatermark(imageData, metadata);

    let maxDiff = 0;
    for (let i = 2, j = 0; i < imageData.data.length; i += 4, j++) {
      const diff = Math.abs(imageData.data[i] - originalBlues[j]);
      if (diff > maxDiff) maxDiff = diff;
    }
    expect(maxDiff).toBeLessThanOrEqual(1);
  });

  it("does not modify red or green channels", () => {
    const imageData = createTestImageData(20, 20);
    const originalRG = new Uint8ClampedArray(20 * 20 * 2);
    for (let i = 0, j = 0; i < imageData.data.length; i += 4, j += 2) {
      originalRG[j] = imageData.data[i];
      originalRG[j + 1] = imageData.data[i + 1];
    }

    applyInvisibleWatermark(imageData, metadata);

    let allMatch = true;
    for (let i = 0, j = 0; i < imageData.data.length; i += 4, j += 2) {
      if (imageData.data[i] !== originalRG[j] || imageData.data[i + 1] !== originalRG[j + 1]) {
        allMatch = false;
        break;
      }
    }
    expect(allMatch).toBe(true);
  });

  it("handles very small images gracefully", () => {
    const imageData = createTestImageData(2, 2);
    expect(() => applyInvisibleWatermark(imageData, metadata)).not.toThrow();
  });

  it("returns null for corrupted watermark data", () => {
    const imageData = createTestImageData();
    // Set random LSBs that won't form a valid watermark
    for (let i = 2; i < 200; i += 4) {
      imageData.data[i] = imageData.data[i] | 1;
    }
    const extracted = extractInvisibleWatermark(imageData);
    expect(extracted).toBeNull();
  });
});
