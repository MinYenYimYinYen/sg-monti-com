/**
 * A saved prepay letter configuration as persisted in MongoDB.
 *
 * Natural key: `name + saId` (unique compound index).
 * `configId` is a slug derived from `name + saId` at creation time and
 * never changes — it is the stable reference used in Redux state.
 *
 * All configs are visible to all users. Only the owner (or admin) may
 * save over or delete a config.
 */
export type PrepayConfigDoc = {
  configId: string;
  name: string;
  /** The author's `saId` (from the JWT token), not their display `userName`. */
  saId: string;

  // customer selection
  selectionMode: "single" | "batch";

  // service selection
  season: number;

  // math
  stdPrepayDiscPercent: number;
  upsellPrepayDiscPercent: number;
  showCreditBalance: boolean;
  showRemitBalance: boolean;

  // messaging
  expirationDate: string;
  autoRenewMessage: string;
  dontAutoRenewMessage: string;
  autoRenewHeader: string;
  dontAutoRenewHeader: string;
  universalMessage: string;
};
