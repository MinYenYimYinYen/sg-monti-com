import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

export type PriorityServiceDoc = CreatedUpdated & {
  servId: number;
  /** ISO date string — mutually exclusive with dateRange. One must be present. */
  date?: string;
  /** Date range — mutually exclusive with date. One must be present. */
  dateRange?: TRange<string>;
  note: string;
  /** Denormalized for display in the CRUD list without requiring a customer context load. */
  custDisplayName: string;
  /** Denormalized for display in the CRUD list without requiring a customer context load. */
  servCodeId: string;
};

export type PriorityServiceProps = {
  service: Service;
};

export type PriorityService = PriorityServiceDoc & PriorityServiceProps;
