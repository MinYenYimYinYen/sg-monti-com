import { randomUUID } from "node:crypto";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { deleteImageIfUnused, validationError } from "@/app/study/_lib/studyCardServer";
import { StudyCardModel, StudyImageModel } from "@/app/study/StudyModels";
import type { AttachFigureParams, FigureResult } from "@/app/study/StudyApiTypes";
import type { StudyCardDoc } from "@/app/study/StudyTypes";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { getAttachBlocker } from "@/app/study/studyCardRules";
import { checkImageUpload, toJpegDataUrl } from "@/app/study/studyImageServerLogic";

// Server only; the caller has already connected to the database.

/**
 * Stores the picture once per deck (the same bytes on several cards share one record) and points the
 * card at it. The previous picture is removed afterwards if nothing else uses it.
 */
export async function attachFigure(params: AttachFigureParams): Promise<StudyCardDoc> {
  const card = await StudyCardModel.findOne({ cardKey: params.cardKey }).lean();
  if (!card) throw validationError("That card no longer exists.");
  const blocker = getAttachBlocker(card);
  if (blocker !== null) throw validationError(blocker);

  const checked = checkImageUpload({
    dataBase64: params.dataBase64,
    widthPx: params.widthPx,
    heightPx: params.heightPx,
    config: STUDY_CONFIG.images,
    maxSidePx: STUDY_CONFIG.limits.maxImageSidePx,
  });
  if (!checked.ok) throw validationError(checked.message);
  const { bytes, widthPx, heightPx, contentHash } = checked.image;

  // One atomic step. The unique index on { deckKey, contentHash } means two requests with the same
  // picture cannot both insert it: the second finds the first's record.
  const stored = await StudyImageModel.findOneAndUpdate(
    { deckKey: card.deckKey, contentHash },
    {
      $setOnInsert: {
        imageKey: randomUUID(),
        mimeType: "image/jpeg",
        widthPx,
        heightPx,
        byteLength: bytes.length,
        data: bytes,
      },
    },
    { upsert: true, new: true, projection: { imageKey: 1 } },
  ).lean();
  if (!stored) throw validationError("The picture could not be saved. Try again.");

  const previousImageKey = card.imageKey;
  const updated = await StudyCardModel.findOneAndUpdate(
    // Re-checks the state, so a card published between the read and now is left alone.
    { cardKey: params.cardKey, kind: "image", status: "draft" },
    { $set: { imageKey: stored.imageKey } },
    { new: true },
  ).lean();
  if (!updated) throw validationError("This card changed while the picture was uploading. Try again.");

  if (previousImageKey !== null && previousImageKey !== stored.imageKey) await deleteImageIfUnused(previousImageKey);
  return cleanMongoObject(updated) as StudyCardDoc;
}

export async function removeFigure(cardKey: string): Promise<StudyCardDoc> {
  const card = await StudyCardModel.findOne({ cardKey }).lean();
  if (!card) throw validationError("That card no longer exists.");
  const blocker = getAttachBlocker(card);
  if (blocker !== null) throw validationError(blocker);

  const updated = await StudyCardModel.findOneAndUpdate(
    { cardKey, kind: "image", status: "draft" },
    { $set: { imageKey: null } },
    { new: true },
  ).lean();
  if (!updated) throw validationError("This card changed. Try again.");
  await deleteImageIfUnused(card.imageKey);
  return cleanMongoObject(updated) as StudyCardDoc;
}

/**
 * One picture as a data URL. `publishedOnly` is what keeps a student from reading a draft's picture:
 * a student op passes it, so an image is returned only while a published card uses it.
 */
export async function loadFigure({
  imageKey,
  publishedOnly,
}: {
  imageKey: string;
  publishedOnly: boolean;
}): Promise<FigureResult> {
  if (publishedOnly) {
    const published = await StudyCardModel.exists({ imageKey, status: "published" });
    if (!published) throw validationError("That picture is not available.");
  }
  const image = await StudyImageModel.findOne({ imageKey }).select({ data: 1, imageKey: 1 }).lean();
  if (!image) throw validationError("That picture no longer exists.");
  return { imageKey, dataUrl: toJpegDataUrl(Buffer.from(image.data)) };
}
