import { QboPreferences } from "@/app/qbo/preferences/types/QboPreferencesTypes";

// Pure helpers for Preferences, free of fetch and the database so they can be tested.

/**
 * The only preference values that may reach the browser. The full object holds the company's
 * email templates and other settings. These are the ones that can change how a purchase is
 * accepted. Each is null when QuickBooks did not return it.
 */
export type QboPreferencesSummary = {
  /** YYYY-MM-DD. Purchases dated on or before it may be refused (error 6210). Not proven as a guard. */
  bookCloseDate: string | null;
  multiCurrencyEnabled: boolean | null;
  trackDepartments: boolean | null;
  useAccountNumbers: boolean | null;
  /**
   * Whether a Purchase DocNumber we send is kept. Null when QuickBooks did not list the setting,
   * which is not the same as false: see the DocNumber discussion in planning/qboPlan.md.
   */
  useCustomTxnNumbers: boolean | null;
  warnDuplicateCheckNumber: boolean | null;
  /** Names only, no values: shows which settings QuickBooks lists without exposing them. */
  otherPrefNames: string[];
};

export const USE_CUSTOM_TXN_NUMBERS_PREF = "VendorAndPurchasesPrefs.UseCustomTxnNumbers";
export const WARN_DUPLICATE_CHECK_NUMBER_PREF = "WarnDuplicateCheckNumber";

/** Intuit sends these settings as the strings "true" and "false". Anything else is unknown. */
export function readOtherPrefFlag({
  preferences,
  name,
}: {
  preferences: QboPreferences;
  name: string;
}): boolean | null {
  const entry = preferences.OtherPrefs?.NameValue?.find((nameValue) => nameValue.Name === name);
  if (!entry) return null;
  const value = String(entry.Value).trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function summarizePreferences(preferences: QboPreferences): QboPreferencesSummary {
  return {
    bookCloseDate: preferences.AccountingInfoPrefs?.BookCloseDate ?? null,
    multiCurrencyEnabled: preferences.CurrencyPrefs?.MultiCurrencyEnabled ?? null,
    trackDepartments: preferences.AccountingInfoPrefs?.TrackDepartments ?? null,
    useAccountNumbers: preferences.AccountingInfoPrefs?.UseAccountNumbers ?? null,
    useCustomTxnNumbers: readOtherPrefFlag({ preferences, name: USE_CUSTOM_TXN_NUMBERS_PREF }),
    warnDuplicateCheckNumber: readOtherPrefFlag({
      preferences,
      name: WARN_DUPLICATE_CHECK_NUMBER_PREF,
    }),
    otherPrefNames: (preferences.OtherPrefs?.NameValue ?? []).map((nameValue) => nameValue.Name),
  };
}
