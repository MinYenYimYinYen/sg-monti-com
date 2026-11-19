import { AppState } from "@/store";

const selectPaymentStatus = (state: AppState) => state.salesTaxPosting.paymentStatus;
const selectLastPostResult = (state: AppState) => state.salesTaxPosting.lastPostResult;
const selectLastRetryProblems = (state: AppState) => state.salesTaxPosting.lastRetryProblems;
const selectPostStatus = (state: AppState) => state.salesTaxPosting.postStatus;
const selectRetryStatus = (state: AppState) => state.salesTaxPosting.retryStatus;

export const salesTaxPostingSelect = {
  paymentStatus: selectPaymentStatus,
  lastPostResult: selectLastPostResult,
  lastRetryProblems: selectLastRetryProblems,
  postStatus: selectPostStatus,
  retryStatus: selectRetryStatus,
};
