import { AppState } from "@/store";

const selectStatus = (state: AppState) => state.qboConnection.status;
const selectTestResult = (state: AppState) => state.qboConnection.testResult;
const selectRevocationUnconfirmed = (state: AppState) => state.qboConnection.revocationUnconfirmed;
const selectDocNumberInspection = (state: AppState) => state.qboConnection.docNumberInspection;

export const qboConnectionSelect = {
  docNumberInspection: selectDocNumberInspection,
  status: selectStatus,
  testResult: selectTestResult,
  revocationUnconfirmed: selectRevocationUnconfirmed,
};
