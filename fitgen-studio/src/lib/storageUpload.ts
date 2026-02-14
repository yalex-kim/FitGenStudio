import { supabase } from "./supabase";

/**
 * Upload a base64-encoded image to Supabase Storage and return the public URL.
 * Falls back to a data: URL if the user is not authenticated or if upload fails.
 */
export async function uploadBase64ToStorage(
  base64: string,
  mimeType: string,
  userId: string | null | undefined,
): Promise<string> {
  // Fallback: build data URL for anonymous users
  if (!userId) {
    return `data:${mimeType};base64,${base64}`;
  }

  try {
    // Convert base64 to Blob
    const byteChars = atob(base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNums)], { type: mimeType });

    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("generations")
      .upload(path, blob, { contentType: mimeType, upsert: false });

    if (error) {
      console.error("Storage upload failed, falling back to data URL:", error);
      return `data:${mimeType};base64,${base64}`;
    }

    const { data: urlData } = supabase.storage
      .from("generations")
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (err) {
    console.error("Storage upload error, falling back to data URL:", err);
    return `data:${mimeType};base64,${base64}`;
  }
}
