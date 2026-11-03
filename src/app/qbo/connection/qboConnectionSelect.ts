import { AppState } from "@/store";

const selectStatus = (state: AppState) => state.qboConnection.status;
const selectRevocationUnconfirmed = (state: AppState) => state.qboConnection.revocationUnconfirmed;

export const qboConnectionSelect = {
  status: selectStatus,
  revocationUnconfirmed: selectRevocationUnconfirmed,
};
