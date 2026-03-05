import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectKeywords = (state: AppState) => state.callAhead.callAheadKeywords;
const selectKeywordMap = createSelector([selectKeywords], (keywords) =>
  new Grouper(keywords).toUniqueMap((kw) => kw.keywordId),
);

export const keywordSelect = {
  keywordMap: selectKeywordMap,
};
