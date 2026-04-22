import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export type QSCustomerState = {
  custId: number | null;
  customer: Customer | null;
  nameOverride: string;
  sizeOverride: string;
};

/** The set of flat @variable keys the editor can contain. */
export type QSVariableKey = "name" | "size";

/** Per-program configuration stored in QuickSend state. Serializable — IDs only. */
export type QSProgramConfig = {
  progCodeId: string;
  includedServCodeIds: string[];
};
