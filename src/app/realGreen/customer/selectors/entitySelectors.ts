import { AppState } from "@/store";
import { CustomerState } from "@/store/reducers/customerReducers";
import { createSelectCustomers } from "@/app/realGreen/customer/selectors/contextSelectors";
import { Program } from "../_lib/entities/types/ProgramTypes";
import { createBatchSelector } from "@/app/realGreen/customer/selectors/lib/createBatchSelector";

export type CustBatch = keyof CustomerState;

const selectBatch = (slice: keyof CustomerState) => (state: AppState) =>
  state.customer[slice];

// Cache for stable selector references to prevent re-computation on every render
const customerSelectors = new Map<
  CustBatch,
  ReturnType<typeof createSelectCustomers>
>();

const selectCustomers = (batch: CustBatch) => {
  if (!customerSelectors.has(batch)) {
    customerSelectors.set(batch, createSelectCustomers(selectBatch(batch)));
  }
  return customerSelectors.get(batch)!;
};

const selectPrograms = createBatchSelector([selectCustomers], (customers) =>
  customers.flatMap((c) => c.programs),
);

type Service = Program["services"][number];

const selectServices = createBatchSelector([selectPrograms], (programs) =>
  programs.flatMap((p) => p.services),
);

export const entitySelect = {
  customers: selectCustomers,
  programs: selectPrograms,
  services: selectServices,
};
