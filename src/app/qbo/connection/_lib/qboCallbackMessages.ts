import { QboCallbackFailureReason } from "@/app/qbo/connection/types/QboConnectionTypes";

const MESSAGES: Record<QboCallbackFailureReason, string> = {
  denied: "The connection was cancelled in QuickBooks. Nothing was changed.",
  missing_params: "Intuit did not return the expected details. Please try connecting again.",
  invalid_state:
    "The connection request was not recognized, or it was already used. Please start again from this page.",
  expired_state: "The connection request expired. Please start again from this page.",
  other_company_connected:
    "A different QuickBooks company is already connected. Disconnect it first, then connect the new one.",
  exchange_failed:
    "Intuit would not complete the connection. Check the server logs for the reference ID, then try again.",
  server_error: "Something went wrong while saving the connection. Check the server logs.",
};

export function isCallbackFailureReason(value: string | null): value is QboCallbackFailureReason {
  return value !== null && Object.prototype.hasOwnProperty.call(MESSAGES, value);
}

export function callbackFailureMessage(reason: QboCallbackFailureReason): string {
  return MESSAGES[reason];
}
