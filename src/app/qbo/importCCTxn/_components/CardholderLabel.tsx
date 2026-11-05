"use client";

import { useSelector } from "react-redux";
import { AppState } from "@/store";
import { importCardSelect } from "@/app/qbo/importCCTxn/importCardSelect";
import { ImportFormatId } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

/** First name and last initial of the person behind a card. Renders nothing for an unassigned card. */
export function CardholderLabel({ formatId, last4 }: { formatId: ImportFormatId; last4: string }) {
  const label = useSelector((state: AppState) =>
    importCardSelect.cardholderLabel(state, { formatId, last4 }),
  );
  if (!label) return null;
  return <div className="text-xs font-medium text-foreground">{label}</div>;
}
