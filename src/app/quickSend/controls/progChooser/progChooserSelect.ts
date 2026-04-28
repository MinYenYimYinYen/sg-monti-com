import { createSelector } from "@reduxjs/toolkit";
import { quickSendSelect } from "@/app/quickSend/quickSendSelect";

const selectProgChooser = createSelector(
  [quickSendSelect.progChooser],
  (progChooser) => progChooser,
);


