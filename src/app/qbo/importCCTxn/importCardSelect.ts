import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { ImportFormatId } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";
import { cardAssignmentKey } from "@/app/qbo/importCCTxn/_lib/importMappingUtils";
import { formatCardholderLabel } from "@/app/qbo/importCCTxn/_lib/importCardholderUtils";

// Who is behind each card, read from the card assignments in state. Kept apart from the Map
// tab's row views, so assigning a card never recomputes every row.

const selectAssignableUserMap = createSelector(
  [importCCTxnMappingSelect.assignableUsers],
  (assignableUsers) => new Grouper(assignableUsers).toUniqueMap((user) => user.userName),
);

/** Card key (formatId:last4) to the label shown above its transactions. */
const selectCardholderLabelMap = createSelector(
  [importCCTxnMappingSelect.cardAssignments, selectAssignableUserMap],
  (cardAssignments, assignableUserMap) =>
    new Map(
      cardAssignments.map((cardAssignment) => [
        cardAssignmentKey(cardAssignment),
        formatCardholderLabel({
          cardAssignment,
          user: assignableUserMap.get(cardAssignment.userName),
        }),
      ]),
    ),
);

const selectCardholderLabel = (
  state: AppState,
  { formatId, last4 }: { formatId: ImportFormatId; last4: string },
) => selectCardholderLabelMap(state).get(cardAssignmentKey({ formatId, last4 })) ?? "";

export const importCardSelect = {
  cardholderLabelMap: selectCardholderLabelMap,
  cardholderLabel: selectCardholderLabel,
};
