import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// --- CallLogReasonRaw ---
// Shape returned by the RealGreen API (endpoint TBD — likely /ActionReason)

export type CallLogReasonRaw = {
  actionReasonID: number;
  actionReason: string;
  status: string;
  contactOrAttempt: string;
  handheld: boolean;
  actionReasonFrench: string;
  actionReasonSpanish: string;
  letterID: number;
  sendNote: boolean;
  blockLead: boolean;
};

// --- CallLogReasonCore ---
// Normalized, camelCase shape. Only fields relevant to this app are kept.

export type CallLogReasonCore = {
  reasonId: number;
  reason: string;
  status: string;
  /** "C" = Contact, "A" = Attempt — drives UI distinctions (e.g., color-coding) */
  contactOrAttempt: string;
  sendNote: boolean;
  blockLead: boolean;
};

// --- CallLogReasonDocProps ---
// Native metadata stored in MongoDB alongside the core fields.
// Minimal for now — the full module structure is warranted because
// status and contactOrAttempt are likely to drive UI logic.

export type CallLogReasonDocProps = CreatedUpdated & {
  reasonId: number;
};

// --- CallLogReasonDoc ---

export type CallLogReasonDoc = CallLogReasonCore & CallLogReasonDocProps;

// --- CallLogReasonProps ---
// Reserved for future hydration additions (e.g., resolved letter, linked templates).

export type CallLogReasonProps = {};

// --- CallLogReason ---
// The fully hydrated entity consumed by selectors and UI.

export type CallLogReason = CallLogReasonDoc & CallLogReasonProps;

// --- Remap ---

function remapCallLogReason(raw: CallLogReasonRaw): CallLogReasonCore {
  return {
    reasonId: raw.actionReasonID,
    reason: raw.actionReason,
    status: raw.status,
    contactOrAttempt: raw.contactOrAttempt,
    sendNote: raw.sendNote,
    blockLead: raw.blockLead,
  };
}

export function remapCallLogReasons(raw: CallLogReasonRaw[]): CallLogReasonCore[] {
  return raw.map(remapCallLogReason);
}

// --- Extend ---

export async function extendCallLogReasons(
  remapped: CallLogReasonCore[],
): Promise<CallLogReasonDoc[]> {
  const { extendEntities } = await import("@/app/realGreen/_lib/extendEntities");
  return extendEntities<CallLogReasonCore, CallLogReasonDocProps, CallLogReasonDoc>({
    cores: remapped,
    idField: "reasonId",
    baseDocProps: {} as CallLogReasonDocProps,
  });
}
