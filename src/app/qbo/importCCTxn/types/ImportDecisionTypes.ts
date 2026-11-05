import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import { MerchantMapping, SkipRule } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";

// The Map tab's unsaved decisions. The draft holds only what the user did. Everything else (what
// a sibling row shows, whether a row is ready, what Save sends) is derived by selectors from
// the draft plus the stored mappings, so a pick on one row updates the others immediately.

/** A vendor the user picked on one row. At most one vendor per family is live at a time. */
export type VendorPick = { rowId: string; merchantKey: string; vendorId: string };

/** An expense account the user picked on one row. Array order is the order of first pick. */
export type AccountPick = { rowId: string; merchantKey: string; accountId: string };

/**
 * A row whose inferred or unconfirmed vendor the user ticked. It records the vendor it was
 * confirmed against, so it stops counting if the family's vendor changes afterwards.
 */
export type ConfirmedRow = { rowId: string; merchantKey: string; vendorId: string };

export type DecisionDraft = {
  vendorPicks: VendorPick[];
  accountPicks: AccountPick[];
  confirmedRows: ConfirmedRow[];
  /** Rows skipped for this record only. */
  skippedRowIds: string[];
  /** Families whose "Always?" box is ticked. */
  alwaysSkipMerchantKeys: string[];
};

/**
 * Where a value on a row came from. `chosen` is this row's own pick. `stored` is saved data
 * nobody changed this session. `inferred` is a value another row's pick put on this family.
 */
export type DecisionSource = "chosen" | "stored" | "inferred" | "none";

export type SkipSource = "none" | "row" | "rule";

/** Primitives only, so a row can subscribe with shallowEqual and re-render only when it changes. */
export type RowDecisionView = {
  rowId: string;
  merchantKey: string;
  vendorId: string;
  vendorSource: DecisionSource;
  /** The vendor saved for the family, "" if none. Picking it again means no change. */
  storedVendorId: string;
  accountId: string;
  accountSource: DecisionSource;
  /** The vendor was filled in from another row or a similar description, so a tick is offered. */
  canConfirmVendor: boolean;
  isVendorConfirmed: boolean;
  /** A vendor that is offered for confirmation and not confirmed yet. Gets the secondary look. */
  needsConfirmation: boolean;
  /** This row's pick replaces the vendor already saved for the merchant. */
  replacesStoredVendor: boolean;
  /** The account came from another row's pick, so the row has not been looked at. */
  isAccountInferred: boolean;
  /** A stored default that may be wrong, because the merchant has been posted to other accounts. */
  isDefaultAccountWorthALook: boolean;
  isSkipped: boolean;
  skipSource: SkipSource;
  isAlwaysSkip: boolean;
  /** Pending rows in this family, for the "Always?" label. */
  familyPendingCount: number;
  isReady: boolean;
  problem: string | null;
};

/** What the draft and the stored mapping together say about one merchant family. */
export type FamilyDecisionView = {
  merchantKey: string;
  hasMapping: boolean;
  /** The vendor the family will have after Save: this session's pick, else the saved one. */
  vendorId: string | null;
  /** True when the vendor comes from a pick this session, so the rows without a pick of their own are inferred. */
  isVendorFromDraft: boolean;
  /**
   * The family's default account: the saved one, or, for a family with no saved mapping, the
   * first account picked on one of its rows. A pick makes the family behave as if it were saved.
   */
  defaultAccountId: string | null;
  isDefaultAccountFromDraft: boolean;
  isAlwaysSkip: boolean;
  pendingCount: number;
};

export type DecisionViews = {
  rowViews: Map<string, RowDecisionView>;
  familyViews: Map<string, FamilyDecisionView>;
};

/** One family to store: its vendor, default account and the descriptions a person confirmed. */
export type MappingDecision = {
  merchantKey: string;
  vendorId: string;
  defaultAccountId: string;
  confirmedDescriptions: string[];
};

/** A null accountId clears the row's own account, so it follows the family default. */
export type RowAccountDecision = { rowId: string; accountId: string | null };

/** Everything one Save sends. */
export type SaveDecisionsParams = {
  mappingDecisions: MappingDecision[];
  rowAccountDecisions: RowAccountDecision[];
  /** Rows skipped for this record only. */
  skippedRowIds: string[];
  /** Families to skip from now on. The server also skips their pending rows. */
  skipRuleMerchantKeys: string[];
};

/** A part of a save that was refused. The rest of the save still went through. */
export type DecisionFailure = {
  merchantKey: string | null;
  rowId: string | null;
  message: string;
};

export type SaveDecisionsResult = {
  merchantMappings: MerchantMapping[];
  skipRules: SkipRule[];
  rows: ImportRow[];
  failures: DecisionFailure[];
};
