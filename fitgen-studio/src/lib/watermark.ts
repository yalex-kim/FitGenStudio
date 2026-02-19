import type { Tier } from "@/lib/usageLimits";

/**
 * Determines whether a visible watermark should be applied based on user tier.
 * Free-tier users get a visible "FitGen Studio" overlay on downloads.
 */
export function shouldApplyVisibleWatermark(tier: Tier): boolean {
  if (import.meta.env.VITE_BYPASS_CREDITS === "true") return false;
  return tier === "free";
}

/**
 * Draws a semi-transparent "FitGen Studio" text overlay across a canvas.
 * The watermark is tiled diagonally to prevent easy cropping.
 */
export function applyVisibleWatermark(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;

  ctx.save();

  // Configure watermark text style
  const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.04));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Tile the watermark diagonally
  const text = "FitGen Studio";
  const spacingX = fontSize * 10;
  const spacingY = fontSize * 5;

  ctx.rotate(-Math.PI / 6); // -30 degrees

  // Expand bounds to cover the rotated area
  const diagonal = Math.sqrt(width * width + height * height);
  for (let y = -diagonal; y < diagonal; y += spacingY) {
    for (let x = -diagonal; x < diagonal; x += spacingX) {
      ctx.fillText(text, x, y);
      ctx.strokeText(text, x, y);
    }
  }

  ctx.restore();
}

/**
 * Embeds an invisible steganographic watermark in image pixel data.
 * Uses LSB (Least Significant Bit) encoding in the blue channel to embed
 * a metadata string without visible alteration.
 */
export function applyInvisibleWatermark(
  imageData: ImageData,
  metadata: WatermarkMetadata
): void {
  const payload = encodeMetadataToPayload(metadata);
  const bits = stringToBits(payload);
  const pixels = imageData.data;

  // Embed bit length as first 32 bits (in blue channel, every 4th byte starting at index 2)
  const lengthBits = numberTo32Bits(bits.length);
  for (let i = 0; i < 32; i++) {
    const pixelIndex = i * 4 + 2; // blue channel
    if (pixelIndex < pixels.length) {
      pixels[pixelIndex] = (pixels[pixelIndex] & 0xfe) | lengthBits[i];
    }
  }

  // Embed payload bits starting after the 32-bit length header
  for (let i = 0; i < bits.length; i++) {
    const pixelIndex = (i + 32) * 4 + 2; // blue channel
    if (pixelIndex < pixels.length) {
      pixels[pixelIndex] = (pixels[pixelIndex] & 0xfe) | bits[i];
    }
  }
}

/**
 * Extracts a steganographic watermark from image pixel data.
 * Returns the decoded metadata or null if no valid watermark is found.
 */
export function extractInvisibleWatermark(
  imageData: ImageData
): WatermarkMetadata | null {
  const pixels = imageData.data;

  // Read 32-bit length header
  const lengthBits: number[] = [];
  for (let i = 0; i < 32; i++) {
    const pixelIndex = i * 4 + 2;
    if (pixelIndex >= pixels.length) return null;
    lengthBits.push(pixels[pixelIndex] & 1);
  }
  const bitLength = bitsTo32Number(lengthBits);

  // Sanity check: payload cannot exceed available pixels
  if (bitLength <= 0 || bitLength > (pixels.length / 4 - 32)) return null;

  // Read payload bits
  const bits: number[] = [];
  for (let i = 0; i < bitLength; i++) {
    const pixelIndex = (i + 32) * 4 + 2;
    if (pixelIndex >= pixels.length) return null;
    bits.push(pixels[pixelIndex] & 1);
  }

  const payload = bitsToString(bits);
  return decodePayloadToMetadata(payload);
}

export interface WatermarkMetadata {
  userId: string;
  imageId: string;
  timestamp: number;
}

// ---- Internal helpers ----

const WATERMARK_MARKER = "FG1|";

function encodeMetadataToPayload(meta: WatermarkMetadata): string {
  return `${WATERMARK_MARKER}${meta.userId}|${meta.imageId}|${meta.timestamp}`;
}

function decodePayloadToMetadata(payload: string): WatermarkMetadata | null {
  if (!payload.startsWith(WATERMARK_MARKER)) return null;
  const parts = payload.slice(WATERMARK_MARKER.length).split("|");
  if (parts.length !== 3) return null;
  const timestamp = Number(parts[2]);
  if (isNaN(timestamp)) return null;
  return {
    userId: parts[0],
    imageId: parts[1],
    timestamp,
  };
}

function stringToBits(str: string): number[] {
  const bits: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bits.push((code >> b) & 1);
    }
  }
  return bits;
}

function bitsToString(bits: number[]): string {
  let str = "";
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let code = 0;
    for (let b = 0; b < 8; b++) {
      code = (code << 1) | bits[i + b];
    }
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str;
}

function numberTo32Bits(n: number): number[] {
  const bits: number[] = [];
  for (let i = 31; i >= 0; i--) {
    bits.push((n >> i) & 1);
  }
  return bits;
}

function bitsTo32Number(bits: number[]): number {
  let n = 0;
  for (let i = 0; i < 32; i++) {
    n = (n << 1) | bits[i];
  }
  return n;
}

/**
 * Processes an image URL through the watermark pipeline and triggers a download.
 * Loads the image onto a canvas, applies watermarks as needed, then downloads.
 */
export async function downloadWithWatermark(
  imageUrl: string,
  fileName: string,
  tier: Tier,
  metadata: WatermarkMetadata
): Promise<void> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // Always apply invisible watermark for traceability
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyInvisibleWatermark(imageData, metadata);
  ctx.putImageData(imageData, 0, 0);

  // Apply visible watermark for free tier
  if (shouldApplyVisibleWatermark(tier)) {
    applyVisibleWatermark(canvas);
  }

  // Trigger download
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
