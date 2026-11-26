import { createHash } from "node:crypto";
import type { StudyConfig } from "@/app/study/studyConst";

// Server only (Node crypto). Checks a picture from the browser before it is stored. The browser
// already shrank it, but the route trusts nothing in the body, so every claim is checked again.

type ImageConfig = StudyConfig["images"];

const JPEG_MAGIC = [0xff, 0xd8, 0xff];

export type CheckedImage = {
  bytes: Buffer;
  widthPx: number;
  heightPx: number;
  contentHash: string;
};

export type ImageCheck = { ok: true; image: CheckedImage } | { ok: false; message: string };

/** True for base64 of the standard alphabet only, so garbage fails before it is decoded. */
function isBase64(value: string): boolean {
  return value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
}

export function checkImageUpload({
  dataBase64,
  widthPx,
  heightPx,
  config,
  maxSidePx,
}: {
  dataBase64: string;
  widthPx: number;
  heightPx: number;
  config: ImageConfig;
  maxSidePx: number;
}): ImageCheck {
  const limitKb = Math.round(config.maxImageBytes / 1024);
  // Checked on the text first, so a huge string is never decoded.
  if (dataBase64.length > Math.ceil(config.maxImageBytes / 3) * 4 + 4) {
    return { ok: false, message: `This picture is larger than ${limitKb} KB.` };
  }
  if (!isBase64(dataBase64)) return { ok: false, message: "The picture data is not valid." };

  const bytes = Buffer.from(dataBase64, "base64");
  if (bytes.length === 0) return { ok: false, message: "The picture is empty." };
  if (bytes.length > config.maxImageBytes) return { ok: false, message: `This picture is larger than ${limitKb} KB.` };
  if (!JPEG_MAGIC.every((byte, index) => bytes[index] === byte)) {
    return { ok: false, message: "Only JPEG pictures are stored." };
  }
  const sizeOk = [widthPx, heightPx].every((side) => Number.isInteger(side) && side >= 1 && side <= maxSidePx);
  if (!sizeOk) return { ok: false, message: "The picture's size is not valid." };

  return { ok: true, image: { bytes, widthPx, heightPx, contentHash: createHash("sha256").update(bytes).digest("hex") } };
}

/** `data:` URL for an `<img>`. Only ever built from bytes this module stored as JPEG. */
export function toJpegDataUrl(bytes: Buffer): string {
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}
