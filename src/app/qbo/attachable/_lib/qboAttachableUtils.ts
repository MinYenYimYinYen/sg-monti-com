import { describeFault } from "@/app/qbo/_lib/api/qboHttpUtils";
import {
  QboAttachable,
  QboAttachableEntityType,
  QboAttachableUploadMetadata,
  QboAttachableUploadResponse,
} from "@/app/qbo/attachable/types/QboAttachableTypes";

// Pure helpers for the attachable module, free of fetch and the database so they can be tested.

// UNVERIFIED part names, from memory of Intuit's examples. Intuit numbers the parts _01, _02...
export const UPLOAD_METADATA_PART = "file_metadata_01";
export const UPLOAD_CONTENT_PART = "file_content_01";

const ENTITY_ID_PATTERN = /^\d+$/;

/** QuickBooks Ids are digits. Anything else must never reach query text. */
export function isSafeEntityId(value: unknown): value is string {
  return typeof value === "string" && ENTITY_ID_PATTERN.test(value);
}

export function buildUploadMetadata({
  fileName,
  contentType,
  entityType,
  entityId,
}: {
  fileName: string;
  contentType: string;
  entityType: QboAttachableEntityType;
  entityId: string;
}): QboAttachableUploadMetadata {
  return {
    FileName: fileName,
    ContentType: contentType,
    AttachableRef: [{ EntityRef: { type: entityType, value: entityId } }],
  };
}

/**
 * Intuit query text for the attachments linked to one entity. The Id must have passed
 * isSafeEntityId. UNVERIFIED against live QuickBooks.
 */
export function buildAttachmentsForEntityWhere({
  entityType,
  entityId,
}: {
  entityType: QboAttachableEntityType;
  entityId: string;
}): string {
  return `AttachableRef.EntityRef.Type = '${entityType}' and AttachableRef.EntityRef.value = '${entityId}'`;
}

export type UploadReading =
  | { kind: "uploaded"; attachableId: string }
  | { kind: "rejected"; message: string }
  | { kind: "unknown"; message: string };

/**
 * What an upload answer means. Only an Attachable with an Id counts as uploaded. A Fault is a
 * certain refusal. Anything else is unknown, because the file may have landed: the caller looks
 * the entity's attachments up before it ever sends the file again.
 */
export function readUploadResponse(response: QboAttachableUploadResponse): UploadReading {
  const item = response.AttachableResponse?.[0];
  if (!item) {
    return { kind: "unknown", message: "QuickBooks answered with no attachment. Check QuickBooks." };
  }
  if (item.Fault) {
    const detail = describeFault({ errors: item.Fault.Error ?? [] });
    return { kind: "rejected", message: detail ?? "QuickBooks rejected the attachment." };
  }
  if (item.Attachable?.Id) return { kind: "uploaded", attachableId: item.Attachable.Id };
  return {
    kind: "unknown",
    message: "QuickBooks answered with an unexpected shape. Check QuickBooks.",
  };
}

/** The attachment with this file name, if the entity already has one. */
export function findAttachmentByFileName({
  attachables,
  fileName,
}: {
  attachables: QboAttachable[];
  fileName: string;
}): QboAttachable | undefined {
  return attachables.find((attachable) => attachable.FileName === fileName);
}
