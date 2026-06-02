import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

const MIME_TO_EXT: Record<string, ".jpg" | ".png" | ".webp"> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAGIC: Record<string, (buf: Buffer) => boolean> = {
  "image/jpeg": (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  "image/png": (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a,
  "image/webp": (buf) =>
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50,
};

export function validateImageFile(
  buffer: Buffer,
  mime: string
): { ext: ".jpg" | ".png" | ".webp"; filename: string } | { error: string } {
  const ext = MIME_TO_EXT[mime];
  if (!ext) return { error: "Invalid file type. Only JPEG, PNG and WebP are allowed." };
  const check = MAGIC[mime];
  if (!check || !check(buffer)) return { error: "File content does not match its type." };
  const filename = `${randomUUID()}${ext}`;
  return { ext, filename };
}

/** Subfolder under `tahla/` in your Cloudinary account. */
export type CloudinaryUploadFolder = "avatars" | "events" | "feed";

let cloudinaryConfigured = false;

function ensureCloudinary(): void {
  if (cloudinaryConfigured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  cloudinaryConfigured = true;
}

/**
 * Upload a validated image buffer to Cloudinary. Returns the HTTPS URL to store in the database.
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  mime: string,
  folder: CloudinaryUploadFolder
): Promise<{ url: string } | { error: string }> {
  const validated = validateImageFile(buffer, mime);
  if ("error" in validated) return { error: validated.error };
  try {
    ensureCloudinary();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Cloudinary not configured" };
  }
  const folderPath = `tahla/${folder}`;
  const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: folderPath,
      resource_type: "image",
      overwrite: false,
      unique_filename: true,
    });
    const url = result.secure_url;
    if (!url || typeof url !== "string") {
      return { error: "Upload failed: no URL returned" };
    }
    return { url };
  } catch (e) {
    console.error("[cloudinary] upload failed", e);
    return { error: "Image upload failed" };
  }
}

/**
 * Extract Cloudinary `public_id` from a `res.cloudinary.com` asset URL (handles optional transforms and version).
 */
export function cloudinaryPublicIdFromUrl(url: string): string | null {
  if (!url?.includes("res.cloudinary.com")) return null;
  try {
    const pathname = new URL(url).pathname;
    const marker = "/upload/";
    const i = pathname.indexOf(marker);
    if (i === -1) return null;
    const segments = pathname.slice(i + marker.length).split("/").filter(Boolean);
    const kept: string[] = [];
    for (const seg of segments) {
      if (seg.includes(",")) continue;
      if (/^v\d+$/i.test(seg)) continue;
      kept.push(seg);
    }
    if (kept.length === 0) return null;
    const last = kept[kept.length - 1]!;
    kept[kept.length - 1] = last.replace(/\.[^.]+$/, "");
    return kept.join("/");
  } catch {
    return null;
  }
}

/**
 * Deletes an image from Cloudinary when `url` is a Cloudinary HTTPS URL.
 * No-ops for null/empty or legacy local `/uploads/...` paths (nothing to delete remotely).
 */
export async function deleteStoredImage(url: string | null | undefined): Promise<void> {
  if (!url?.trim()) return;
  if (url.startsWith("/uploads/")) return;
  const publicId = cloudinaryPublicIdFromUrl(url);
  if (!publicId) return;
  try {
    ensureCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (e) {
    console.warn("[cloudinary] destroy failed", publicId, e);
  }
}
