"use client";

import { shallowEqual, useSelector } from "react-redux";
import { AppState } from "@/store";
import { Checkbox } from "@/style/components/checkbox";
import { importDecisionSelect } from "@/app/qbo/importCCTxn/decisions/importDecisionSelect";
import { useImportDecision } from "@/app/qbo/importCCTxn/decisions/useImportDecision";

/**
 * Appears next to a skipped row. Ticking it skips every pending transaction of the merchant, now
 * and in future imports, so the label says how many are waiting. It is not shown by default:
 * a merchant that sells both items and expenses (Amazon) should be skipped one row at a time.
 */
export function SkipAlwaysCheckbox({ rowId }: { rowId: string }) {
  const view = useSelector(
    (state: AppState) => importDecisionSelect.rowView(state, rowId),
    shallowEqual,
  );
  const { setAlwaysSkip } = useImportDecision();

  if (!view || !view.isSkipped) return null;

  const otherPendingCount = view.familyPendingCount - 1;
  const effect =
    otherPendingCount > 0
      ? `skips this merchant's ${view.familyPendingCount} pending transactions and every future one`
      : "skips every future transaction from this merchant";

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-foreground">
      <Checkbox
        checked={view.isAlwaysSkip}
        onCheckedChange={(checked) =>
          setAlwaysSkip({ merchantKey: view.merchantKey, isAlwaysSkip: checked === true })
        }
        aria-label="Always skip this merchant"
      />
      Always? <span className="text-muted-foreground">({effect})</span>
    </label>
  );
}
