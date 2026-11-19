import { toast } from "react-toastify";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { capabilityLabel } from "@/permission/logic/capabilityLabels";
import { formatAccessDeniedMessage } from "@/lib/errors/accessDenied";
import { AccessDeniedBatch, AccessDenial, createAccessDeniedCollector } from "@/lib/errors/accessDeniedCollector";

const ACCESS_DENIED_TOAST_ID = "access-denied";
const COLLECT_WINDOW_MS = 400;

// What the open toast currently lists. A later burst adds to it, so the toast never shrinks to
// only the newest refusals. Cleared when the toast closes.
const listedCapabilities = new Set<string>();

function labelOf(capability: string): string {
  return capabilityLabel({ capability, registry: capabilityRegistry });
}

function showBatch(batch: AccessDeniedBatch) {
  // Logged on every flush, including silenced ones, so a refusal is never invisible.
  console.warn("[access denied]", { missing: batch.capabilities, ops: batch.ops });

  if (batch.silent || typeof window === "undefined") return;

  const isOpen = toast.isActive(ACCESS_DENIED_TOAST_ID);
  if (!isOpen) listedCapabilities.clear();
  batch.capabilities.forEach((capability) => listedCapabilities.add(capability));

  const message = formatAccessDeniedMessage({ capabilities: [...listedCapabilities], labelOf });

  if (isOpen) {
    // updateId restarts the auto-close timer, so a fresh refusal is not dismissed early.
    toast.update(ACCESS_DENIED_TOAST_ID, { render: message, updateId: Date.now() });
  } else {
    toast.warn(message, { toastId: ACCESS_DENIED_TOAST_ID, onClose: () => listedCapabilities.clear() });
  }
}

const collector = createAccessDeniedCollector({ windowMs: COLLECT_WINDOW_MS, onFlush: showBatch });

/** Queue one refused capability. All refusals within the window become a single toast. */
export function reportAccessDenied(denial: AccessDenial) {
  collector.add(denial);
}
