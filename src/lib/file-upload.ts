import { randomUUID } from "crypto";

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
