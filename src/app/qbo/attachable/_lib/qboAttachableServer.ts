import { AppError } from "@/lib/errors/AppError";
import { qboApi } from "@/app/qbo/_lib/api/qboApi";
import { qboQueryAll } from "@/app/qbo/_lib/api/qboQuery";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import {
  QboAttachable,
  QboAttachableEntityType,
  QboAttachableUploadResponse,
  QboAttachmentFile,
} from "@/app/qbo/attachable/types/QboAttachableTypes";
import {
  buildAttachmentsForEntityWhere,
  buildUploadMetadata,
  isSafeEntityId,
  readUploadResponse,
  UPLOAD_CONTENT_PART,
  UPLOAD_METADATA_PART,
  UploadReading,
} from "@/app/qbo/attachable/_lib/qboAttachableUtils";

// Server only. The ONLY code that uploads attachments to QuickBooks (POST /upload).

function describeThrown(error: unknown): { type: string; statusCode: number; message: string } {
  const appError = error instanceof AppError ? error : null;
  return {
    type: appError?.type ?? "UNKNOWN_ERROR",
    statusCode: appError?.statusCode ?? 500,
    message: appError?.message ?? "The upload to QuickBooks failed unexpectedly.",
  };
}

/** Every attachment linked to one entity. Always a fresh read. */
export async function findAttachmentsForEntity({
  entityType,
  entityId,
}: {
  entityType: QboAttachableEntityType;
  entityId: string;
}): Promise<QboAttachable[]> {
  if (!isSafeEntityId(entityId)) {
    throw new AppError({
      message: "The QuickBooks entity Id is not valid.",
      type: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }
  return qboQueryAll<QboAttachable>({
    entity: "Attachable",
    where: buildAttachmentsForEntityWhere({ entityType, entityId }),
  });
}

/**
 * Uploads one file linked to one entity. A request that may have landed (a network failure or a
 * server error) is "unknown", never "rejected", because rejecting lets the file be sent again and
 * it could be attached twice. The caller lists the entity's attachments before any resend.
 */
export async function uploadQboAttachment({
  file,
  entityType,
  entityId,
}: {
  file: QboAttachmentFile;
  entityType: QboAttachableEntityType;
  entityId: string;
}): Promise<UploadReading> {
  const form = new FormData();
  const metadata = buildUploadMetadata({
    fileName: file.fileName,
    contentType: file.contentType,
    entityType,
    entityId,
  });
  form.append(
    UPLOAD_METADATA_PART,
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    "attachment.json",
  );
  form.append(
    UPLOAD_CONTENT_PART,
    new Blob([file.text], { type: file.contentType }),
    file.fileName,
  );

  try {
    const response = await qboApi<QboAttachableUploadResponse>({
      path: "/upload",
      method: "POST",
      pathTemplate: "/upload",
      timeoutMs: qboConst.attachmentUploadTimeoutMs,
      body: form,
    });
    return readUploadResponse(response);
  } catch (error) {
    const thrown = describeThrown(error);
    if (thrown.type === "NETWORK_ERROR" || thrown.statusCode >= 500) {
      return {
        kind: "unknown",
        message: `${thrown.message} The file may or may not have been attached. Check QuickBooks.`,
      };
    }
    return { kind: "rejected", message: thrown.message };
  }
}
