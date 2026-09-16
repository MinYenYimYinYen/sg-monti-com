import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CustomerSanitySortMode = "byCustomerCount" | "byProgCodeCount";
export type CustomerSanitySortDirection = "asc" | "desc";

const SANITY_PREFS_KEY = "sanity.uiPrefs";
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// SanityUiPrefs — user preferences for the sanity section.
// All fields are UI config only (no domain data). Persisted to localStorage
// on every change so user preferences survive page reloads.
// ---------------------------------------------------------------------------

type SanityUiPrefs = {
  /** Preferences shared across all sanity pages. */
  allPages: {
    /** Prog code IDs excluded from combo-key grouping in all sanity views. */
    excludedProgCodeIds: string[];
  };
  /** Preferences specific to the Customer Sanity page. */
  customerSanityPage: {
    sortMode: CustomerSanitySortMode;
    sortDirection: CustomerSanitySortDirection;
  };
  /** Preferences specific to the Program Sanity page. */
  programSanityPage: {
    selectedProgCodeId: string | null;
  };
  /** Preferences specific to the Size Sanity page. */
  sizeSanityPage: {
    /**
     * Customer IDs the user has marked as "finished" (reviewed and considered valid).
     * Filtered out of the active list so the user can maintain their spot.
     * Expires after 6 months — these checks are performed once annually.
     */
    finishedCustIds: number[];
    /** ISO timestamp of the last modification to finishedCustIds. Used for expiry. */
    finishedAt: string | null;
  };
};

const defaultPrefs: SanityUiPrefs = {
  allPages: {
    excludedProgCodeIds: [],
  },
  customerSanityPage: {
    sortMode: "byCustomerCount",
    sortDirection: "asc",
  },
  programSanityPage: {
    selectedProgCodeId: null,
  },
  sizeSanityPage: {
    finishedCustIds: [],
    finishedAt: null,
  },
};

function isExpired(finishedAt: string | null): boolean {
  if (!finishedAt) return false;
  const age = Date.now() - new Date(finishedAt).getTime();
  return age > SIX_MONTHS_MS;
}

function getStoredSanityPrefs(): SanityUiPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const stored = localStorage.getItem(SANITY_PREFS_KEY);
    if (!stored) return defaultPrefs;
    const parsed = JSON.parse(stored) as Partial<SanityUiPrefs>;
    const sizeSanityStored = parsed.sizeSanityPage ?? {};
    const mergedSizeSanity: SanityUiPrefs["sizeSanityPage"] = {
      ...defaultPrefs.sizeSanityPage,
      ...sizeSanityStored,
    };

    // Expire finished list if older than 6 months
    if (isExpired(mergedSizeSanity.finishedAt)) {
      mergedSizeSanity.finishedCustIds = [];
      mergedSizeSanity.finishedAt = null;
    }

    // Deep merge stored values over defaults so new fields get their defaults
    return {
      allPages: { ...defaultPrefs.allPages, ...parsed.allPages },
      customerSanityPage: { ...defaultPrefs.customerSanityPage, ...parsed.customerSanityPage },
      programSanityPage: { ...defaultPrefs.programSanityPage, ...parsed.programSanityPage },
      sizeSanityPage: mergedSizeSanity,
    };
  } catch {
    return defaultPrefs;
  }
}

function persistSanityPrefs(state: SanityUiPrefs): void {
  try {
    localStorage.setItem(SANITY_PREFS_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

const sanitySlice = createSlice({
  name: "sanity",
  initialState: getStoredSanityPrefs(),
  reducers: {
    // --- allPages ---
    toggleExcludedProgCodeId(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.allPages.excludedProgCodeIds.indexOf(id);
      if (idx === -1) {
        state.allPages.excludedProgCodeIds.push(id);
      } else {
        state.allPages.excludedProgCodeIds.splice(idx, 1);
      }
      persistSanityPrefs(state);
    },
    clearExcludedProgCodeIds(state) {
      state.allPages.excludedProgCodeIds = [];
      persistSanityPrefs(state);
    },

    // --- customerSanityPage ---
    setSortMode(state, action: PayloadAction<CustomerSanitySortMode>) {
      state.customerSanityPage.sortMode = action.payload;
      persistSanityPrefs(state);
    },
    setSortDirection(state, action: PayloadAction<CustomerSanitySortDirection>) {
      state.customerSanityPage.sortDirection = action.payload;
      persistSanityPrefs(state);
    },

    // --- programSanityPage ---
    setSelectedProgCodeId(state, action: PayloadAction<string | null>) {
      state.programSanityPage.selectedProgCodeId = action.payload;
      persistSanityPrefs(state);
    },

    // --- sizeSanityPage ---
    markSizeSanityCustomerFinished(state, action: PayloadAction<number>) {
      const custId = action.payload;
      if (!state.sizeSanityPage.finishedCustIds.includes(custId)) {
        state.sizeSanityPage.finishedCustIds.push(custId);
        state.sizeSanityPage.finishedAt = new Date().toISOString();
        persistSanityPrefs(state);
      }
    },
    unmarkSizeSanityCustomerFinished(state, action: PayloadAction<number>) {
      const custId = action.payload;
      const idx = state.sizeSanityPage.finishedCustIds.indexOf(custId);
      if (idx !== -1) {
        state.sizeSanityPage.finishedCustIds.splice(idx, 1);
        state.sizeSanityPage.finishedAt = new Date().toISOString();
        persistSanityPrefs(state);
      }
    },
    clearSizeSanityFinished(state) {
      state.sizeSanityPage.finishedCustIds = [];
      state.sizeSanityPage.finishedAt = null;
      persistSanityPrefs(state);
    },
  },
});

export const sanityActions = sanitySlice.actions;
export const sanityReducer = sanitySlice.reducer;
