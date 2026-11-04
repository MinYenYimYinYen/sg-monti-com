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
};

export function summarizePreferences(preferences: QboPreferences): QboPreferencesSummary {
  return {
    bookCloseDate: preferences.AccountingInfoPrefs?.BookCloseDate ?? null,
    multiCurrencyEnabled: preferences.CurrencyPrefs?.MultiCurrencyEnabled ?? null,
    trackDepartments: preferences.AccountingInfoPrefs?.TrackDepartments ?? null,
    useAccountNumbers: preferences.AccountingInfoPrefs?.UseAccountNumbers ?? null,
  };
}
