import { QboFault, QboModificationMetaData } from "@/app/qbo/_lib/types/QboCommonTypes";

// Intuit's Attachable entity, written from the Attachable reference page (minor version 75).
// Every documented field is listed. Fields we do not use are commented out, so the full surface
// stays visible.
//
// This app only uploads file attachments (POST /upload) and reads them back by the entity they are
// linked to. Notes, update, delete and download are not built.
//
// UNVERIFIED until the first live upload: the multipart part names, that QuickBooks accepts
// text/plain and text/csv, and the query on AttachableRef.

/** The entity types an attachment may be linked to that this app uses. */
export type QboAttachableEntityType = "JournalEntry";

export type QboAttachableRef = {
  EntityRef: { type: QboAttachableEntityType; value: string };
  // IncludeOnSend?: boolean; // Only meaningful for invoices and the like.
};

export type QboAttachable = {
  Id: string;
  SyncToken: string;
  /** Required for a file attachment. */
  FileName?: string;
  ContentType?: string;
  AttachableRef?: QboAttachableRef[];
  MetaData?: QboModificationMetaData;
  /** Read only. */
  Size?: number;

  // Unused fields.
  // Note?: string; // A standalone note, or one related to the file.
  // Category?: "Contact Photo" | "Document" | "Image" | "Receipt" | "Signature" | "Sound" | "Other";
  // PlaceName?: string;
  // Long?: string;
  // Lat?: string;
  // Tag?: string;
  // FileAccessUri?: string; // Read only.
  // ThumbnailFileAccessUri?: string; // Read only.
  // TempDownloadUri?: string; // Read only. Expires after 15 minutes.
  // ThumbnailTempDownloadUri?: string; // Read only.
};

/** The metadata part of an upload: which file this is and what it is linked to. */
export type QboAttachableUploadMetadata = {
  FileName: string;
  ContentType: string;
  AttachableRef: QboAttachableRef[];
};

/** One answer inside an upload response. A file QuickBooks refused carries a Fault instead. */
export type QboAttachableResponseItem = {
  Attachable?: QboAttachable;
  Fault?: QboFault;
};

export type QboAttachableUploadResponse = {
  AttachableResponse: QboAttachableResponseItem[];
  time?: string;
};

/** A file we send: text with the name and type it carries in QuickBooks. */
export type QboAttachmentFile = {
  fileName: string;
  contentType: string;
  text: string;
};
