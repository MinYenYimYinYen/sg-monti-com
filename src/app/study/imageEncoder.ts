import { squeezeToFit, type EncodedImage, type SqueezeResult } from "@/app/study/studyImageSqueeze";
import { STUDY_CONFIG } from "@/app/study/studyConst";

// Browser side of attaching a picture: decode the file, draw it on a white canvas, and encode JPEG.
// The search for a size that fits is `squeezeToFit`; this only supplies the canvas.

async function canvasToJpegBytes({ canvas, quality }: { canvas: HTMLCanvasElement; quality: number }): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("This browser could not encode the picture.");
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Turns a pasted or chosen picture into JPEG bytes under the storage cap. The canvas is filled white
 * first, because a PNG snip can be transparent and JPEG has no alpha, which would turn black.
 * Re-encoding also drops whatever metadata the file carried.
 */
export async function encodePictureFile(file: File): Promise<SqueezeResult> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, attempts: 0, message: "That picture could not be read. Try a PNG or JPEG." };
  }

  try {
    const { maxImageSidePx } = STUDY_CONFIG.limits;
    if (bitmap.width > maxImageSidePx * 4 || bitmap.height > maxImageSidePx * 4) {
      return { ok: false, attempts: 0, message: "That picture is far larger than a card needs. Crop it first." };
    }

    return await squeezeToFit({
      sourceWidthPx: bitmap.width,
      config: STUDY_CONFIG.images,
      encode: async ({ widthPx, quality }): Promise<EncodedImage> => {
        const heightPx = Math.max(1, Math.round((bitmap.height * widthPx) / bitmap.width));
        const canvas = document.createElement("canvas");
        canvas.width = widthPx;
        canvas.height = heightPx;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("This browser could not prepare the picture.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, widthPx, heightPx);
        context.drawImage(bitmap, 0, 0, widthPx, heightPx);
        return { bytes: await canvasToJpegBytes({ canvas, quality }), widthPx, heightPx };
      },
    });
  } finally {
    bitmap.close();
  }
}
