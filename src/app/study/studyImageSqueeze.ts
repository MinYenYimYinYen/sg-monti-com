import type { StudyConfig } from "@/app/study/studyConst";

// Shrinks a picture until it fits the storage cap. The encoder is injected (a canvas in the browser,
// a fake in a test), so the search itself is pure and testable.

type ImageConfig = StudyConfig["images"];

export type EncodedImage = { bytes: Uint8Array; widthPx: number; heightPx: number };

/** Encodes the source at a width and JPEG quality (0 to 1). Height follows from the aspect ratio. */
export type EncodeJpeg = (params: { widthPx: number; quality: number }) => Promise<EncodedImage>;

export type SqueezeResult =
  | { ok: true; image: EncodedImage; attempts: number }
  | { ok: false; message: string; attempts: number };

/** Widths to try, largest first: the target, then each shrink step down to the minimum. Never above the source. */
export function buildWidthSteps({ sourceWidthPx, config }: { sourceWidthPx: number; config: ImageConfig }): number[] {
  const widths: number[] = [];
  let width = Math.min(config.targetWidthPx, sourceWidthPx);
  while (width >= config.minimumWidthPx) {
    widths.push(Math.round(width));
    width *= config.shrinkFactor;
  }
  // A source narrower than the minimum is still worth trying once, at its own width.
  if (widths.length === 0) widths.push(Math.round(sourceWidthPx));
  return [...new Set(widths)];
}

/**
 * Tries each width from largest to smallest and, at each, each quality from best to worst, and keeps
 * the first result that fits. Quality drops before size because a smaller picture loses more than a
 * blurrier one for a diagram a learner has to read.
 */
export async function squeezeToFit({
  sourceWidthPx,
  encode,
  config,
}: {
  sourceWidthPx: number;
  encode: EncodeJpeg;
  config: ImageConfig;
}): Promise<SqueezeResult> {
  let attempts = 0;
  for (const widthPx of buildWidthSteps({ sourceWidthPx, config })) {
    for (const quality of config.jpegQualitySteps) {
      attempts += 1;
      const image = await encode({ widthPx, quality });
      if (image.bytes.length <= config.maxImageBytes) return { ok: true, image, attempts };
    }
  }
  const limitKb = Math.round(config.maxImageBytes / 1024);
  return {
    ok: false,
    attempts,
    message: `This picture is too detailed to fit in ${limitKb} KB. Crop it tighter and try again.`,
  };
}

/** Why a chosen or pasted file cannot be used at all, or null. Checked before it is decoded. */
export function checkImageSource({ type, size, config }: { type: string; size: number; config: ImageConfig }): string | null {
  if (!type.startsWith("image/")) return "That is not a picture.";
  if (size > config.maxSourceBytes) {
    return `That picture is too large (${Math.round(config.maxSourceBytes / (1024 * 1024))} MB at most).`;
  }
  return null;
}

/** The first picture on a clipboard, or null. Takes the items, so a test needs no browser. */
export function findClipboardImage(items: { type: string; getAsFile: () => File | null }[]): File | null {
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}
