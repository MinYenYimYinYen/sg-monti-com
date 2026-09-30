import type { FlatVars } from "@/components/MentionEditor/MentionEditorUtils";

/**
 * The runtime variables available as @ mentions in prepay letter text fields.
 *
 * Must remain a flat record of `string | number` values only — enforced by `FlatVars`.
 * Adding a non-primitive property here will cause a TypeScript error at the
 * `satisfies FlatVars` assertion below, and will also require a new entry in
 * `prepayLetterVarParsers` in `prepayConfigSelect.ts`.
 */
export type PrepayLetterVars = {
  season: number;
  stdPrepayDiscPercent: number;
  upsellPrepayDiscPercent: number;
  expirationDate: string;
};

// Compile-time guard: errors if PrepayLetterVars contains non-primitive values.
type _AssertFlat = PrepayLetterVars extends FlatVars ? true : never;
const _check: _AssertFlat = true;
void _check;

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
export type PrepayConfig = {
  configId: string;
  name: string;
  /** The author's `saId` (from the JWT token), not their display `userName`. */
  saId: string;

  // customer selection
  selectionMode: "single" | "batch";

  // math
  showCreditBalance: boolean;
  showRemitBalance: boolean;

  // messaging
  autoRenewMessage: string;
  dontAutoRenewMessage: string;
  autoRenewHeader: string;
  dontAutoRenewHeader: string;
  universalMessage: string;
} & PrepayLetterVars;
