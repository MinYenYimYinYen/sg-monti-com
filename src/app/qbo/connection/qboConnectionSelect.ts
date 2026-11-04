import { AppState } from "@/store";

const selectStatus = (state: AppState) => state.qboConnection.status;
const selectTestResult = (state: AppState) => state.qboConnection.testResult;
const selectRevocationUnconfirmed = (state: AppState) => state.qboConnection.revocationUnconfirmed;

export const qboConnectionSelect = {
  status: selectStatus,
  testResult: selectTestResult,
  revocationUnconfirmed: selectRevocationUnconfirmed,
};
