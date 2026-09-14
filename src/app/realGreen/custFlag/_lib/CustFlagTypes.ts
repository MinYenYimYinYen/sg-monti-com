export type FlagIdCustIds = {
  flagId: number;
  custIds: number[];
};

export type CustFlagMap = Map<number, number[]>;

/**
 * Result of refreshing custFlag state for a single customer.
 * Contains which of the currently-loaded flagIds are present on the customer.
 * Used to add/remove the custId from the appropriate flagIdCustIds entries.
 */
export type CustFlagRefreshResult = {
  custId: number;
  /** Subset of flagIdsInState that are currently on this customer */
  presentFlagIds: number[];
};
