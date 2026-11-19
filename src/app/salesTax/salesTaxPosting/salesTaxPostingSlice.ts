import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { SalesTaxPostingContract } from "@/app/salesTax/salesTaxPosting/api/SalesTaxPostingContract";
import {
  PostSalesTaxPaymentResult,
  SalesTaxPaymentStatus,
} from "@/app/salesTax/salesTaxPosting/SalesTaxPostingTypes";
import { mergePostIntoStatus } from "@/app/salesTax/salesTaxPosting/_lib/salesTaxPostingStateUtils";

// What the dialog shows is the server's answer: the stored record of the month's payment and the
// answer to the last post. None of these thunks has a staleTime, so a second dispatch while one is
// running is ignored, which is what we want for a write. The status read is forced by the hook.
const getSalesTaxPaymentStatus = createStandardThunk<SalesTaxPostingContract, "getStatus">({
  typePrefix: "salesTaxPosting/getStatus",
  apiPath: "/salesTax/salesTaxPosting/api",
  opName: "getStatus",
});

const postSalesTaxPayment = createStandardThunk<SalesTaxPostingContract, "post">({
  typePrefix: "salesTaxPosting/post",
  apiPath: "/salesTax/salesTaxPosting/api",
  opName: "post",
});

const retrySalesTaxAttachments = createStandardThunk<SalesTaxPostingContract, "retryAttachments">({
  typePrefix: "salesTaxPosting/retryAttachments",
  apiPath: "/salesTax/salesTaxPosting/api",
  opName: "retryAttachments",
});

type SalesTaxPostingState = {
  paymentStatus: SalesTaxPaymentStatus | null;
  /** The answer to the last post request, so the dialog can show problems and warnings. */
  lastPostResult: PostSalesTaxPaymentResult | null;
  /** Problems from the last retry of the files, empty when it went through. */
  lastRetryProblems: string[];
  postStatus: "idle" | "pending" | "success" | "error";
  retryStatus: "idle" | "pending" | "success" | "error";
};

const initialState: SalesTaxPostingState = {
  paymentStatus: null,
  lastPostResult: null,
  lastRetryProblems: [],
  postStatus: "idle",
  retryStatus: "idle",
};

const salesTaxPostingSlice = createSlice({
  name: "salesTaxPosting",
  initialState,
  reducers: {
    // Called when the dialog unmounts, so the next one never opens on the last run's answer.
    resetPostingState: (state) => {
      state.lastPostResult = null;
      state.lastRetryProblems = [];
      state.postStatus = "idle";
      state.retryStatus = "idle";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getSalesTaxPaymentStatus.fulfilled, (state, action) => {
      state.paymentStatus = action.payload;
    });

    builder.addCase(postSalesTaxPayment.pending, (state) => {
      state.postStatus = "pending";
      state.lastPostResult = null;
    });
    builder.addCase(postSalesTaxPayment.fulfilled, (state, action) => {
      state.postStatus = action.payload.problems.length > 0 ? "error" : "success";
      state.lastPostResult = action.payload;
      state.paymentStatus = mergePostIntoStatus({
        held: state.paymentStatus,
        result: action.payload,
      });
    });
    builder.addCase(postSalesTaxPayment.rejected, (state) => {
      state.postStatus = "error";
    });

    builder.addCase(retrySalesTaxAttachments.pending, (state) => {
      state.retryStatus = "pending";
      state.lastRetryProblems = [];
    });
    builder.addCase(retrySalesTaxAttachments.fulfilled, (state, action) => {
      state.retryStatus = action.payload.problems.length > 0 ? "error" : "success";
      state.lastRetryProblems = action.payload.problems;
      if (state.paymentStatus?.periodEnd === action.payload.periodEnd) {
        state.paymentStatus.attachments = action.payload.attachments;
      }
    });
    builder.addCase(retrySalesTaxAttachments.rejected, (state) => {
      state.retryStatus = "error";
    });
  },
});

export const salesTaxPostingActions = {
  ...salesTaxPostingSlice.actions,
  getSalesTaxPaymentStatus,
  postSalesTaxPayment,
  retrySalesTaxAttachments,
};
export const salesTaxPostingReducer = salesTaxPostingSlice.reducer;
