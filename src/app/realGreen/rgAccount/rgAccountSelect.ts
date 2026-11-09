import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { RgAccount } from "@/app/realGreen/rgAccount/RgAccountTypes";

const selectRgAccountCores = (state: AppState) => state.rgAccount.rgAccountCores;

const selectRgAccounts = createSelector([selectRgAccountCores], (cores) => {
  return cores.map((core) => {
    const rgAccount: RgAccount = { ...core };
    return rgAccount;
  });
});

const selectRgAccountMap = createSelector([selectRgAccounts], (rgAccounts) => {
  return new Grouper(rgAccounts).toUniqueMap((a) => a.rgAccountId);
});

export const rgAccountSelect = {
  rgAccounts: selectRgAccounts,
  rgAccountMap: selectRgAccountMap,
};
