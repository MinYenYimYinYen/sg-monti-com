import { AppState } from "@/store";

const selectDryCustomers = (state: AppState) =>
  state.activeCustomers.dryCustomers;
const selectDryPrograms = (state: AppState) =>
  state.activeCustomers.dryPrograms;
const selectDryServices = (state: AppState) =>
  state.activeCustomers.dryServices;

export const activeCustSelectors = {
  dryCustomers: selectDryCustomers,
  dryPrograms: selectDryPrograms,
  dryServices: selectDryServices,
};
