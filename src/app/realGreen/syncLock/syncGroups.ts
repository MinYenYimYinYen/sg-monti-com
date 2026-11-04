import { SYNC_ENTITY_TYPES, SyncEntityType } from "@/app/realGreen/syncMetadata/syncEntityTypes";

/**
 * A sync group is the unit that is locked, wiped and fully re-synced together.
 *
 * `customerGroup` covers customer, program and service. They are one group because
 * service borrows the program sync edge, and mirror queries join all three.
 * `callLog` is independent: nothing in the mirror query pipeline reads it.
 */
export const SYNC_GROUPS = {
  customerGroup: "customerGroup",
  callLog: "callLog",
} as const;

export type SyncGroup = (typeof SYNC_GROUPS)[keyof typeof SYNC_GROUPS];

export const ALL_SYNC_GROUPS: readonly SyncGroup[] = [SYNC_GROUPS.customerGroup, SYNC_GROUPS.callLog];

export const GROUP_ENTITY_TYPES: Record<SyncGroup, readonly SyncEntityType[]> = {
  customerGroup: [SYNC_ENTITY_TYPES.customer, SYNC_ENTITY_TYPES.program, SYNC_ENTITY_TYPES.service],
  callLog: [SYNC_ENTITY_TYPES.callLog],
};

export const GROUP_LABELS: Record<SyncGroup, string> = {
  customerGroup: "customers, programs and services",
  callLog: "call logs",
};

export const ENTITY_LABELS: Record<SyncEntityType, string> = {
  customer: "Customers",
  program: "Programs",
  service: "Services",
  callLog: "Call logs",
};
