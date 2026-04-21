import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export type QSCustomerState = {
  custId: number | null;
  customer: Customer | null;
  nameOverride: string;
  sizeOverride: string;
};

export const initialCustomerState: QSCustomerState = {
  custId: null,
  customer: null,
  nameOverride: "",
  sizeOverride: "",
};

/** The set of @variable keys the editor can contain. */
export type QSVariableKey = "name" | "size";

/** Top-level QuickSend state — grows as new variable types are added. */
export type QuickSendState = {
  customer: QSCustomerState;
  activeVars: Set<QSVariableKey>;
};

export const initialQuickSendState: QuickSendState = {
  customer: initialCustomerState,
  activeVars: new Set(),
};
