import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { readLocalStorage, writeLocalStorage } from "@/lib/misc/localStorageUtils";

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
    /**
     * Customer IDs the user has marked as "finished" (reviewed and considered valid).
     * Filtered out of the active list so the user can maintain their spot.
     * Expires after 6 months — these checks are performed once annually.
     */
    finishedCustIds: number[];
    /** ISO timestamp of the last modification to finishedCustIds. Used for expiry. */
    finishedAt: string | null;
  };
  /** Preferences specific to the Program Sanity page. */
  programSanityPage: {
    selectedProgCodeId: string | null;
    /**
     * Program IDs the user has marked as "finished" (reviewed and considered valid).
     * Filtered out of the active list so the user can maintain their spot.
     * Expires after 6 months — these checks are performed once annually.
     */
    finishedProgIds: number[];
    /** ISO timestamp of the last modification to finishedProgIds. Used for expiry. */
    finishedAt: string | null;
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
    finishedCustIds: [],
    finishedAt: null,
  },
  programSanityPage: {
    selectedProgCodeId: null,
    finishedProgIds: [],
    finishedAt: null,
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
  const parsed = readLocalStorage<Partial<SanityUiPrefs>>(SANITY_PREFS_KEY, {});

  const sizeSanityStored = parsed.sizeSanityPage ?? {};
  const mergedSizeSanity: SanityUiPrefs["sizeSanityPage"] = {
    ...defaultPrefs.sizeSanityPage,
    ...sizeSanityStored,
  };
  if (isExpired(mergedSizeSanity.finishedAt)) {
    mergedSizeSanity.finishedCustIds = [];
    mergedSizeSanity.finishedAt = null;
  }

  const customerSanityStored = parsed.customerSanityPage ?? {};
  const mergedCustomerSanity: SanityUiPrefs["customerSanityPage"] = {
    ...defaultPrefs.customerSanityPage,
    ...customerSanityStored,
  };
  if (isExpired(mergedCustomerSanity.finishedAt)) {
    mergedCustomerSanity.finishedCustIds = [];
    mergedCustomerSanity.finishedAt = null;
  }

  const programSanityStored = parsed.programSanityPage ?? {};
  const mergedProgramSanity: SanityUiPrefs["programSanityPage"] = {
    ...defaultPrefs.programSanityPage,
    ...programSanityStored,
  };
  if (isExpired(mergedProgramSanity.finishedAt)) {
    mergedProgramSanity.finishedProgIds = [];
    mergedProgramSanity.finishedAt = null;
  }

  // Deep merge stored values over defaults so new fields get their defaults
  return {
    allPages: { ...defaultPrefs.allPages, ...parsed.allPages },
    customerSanityPage: mergedCustomerSanity,
    programSanityPage: mergedProgramSanity,
    sizeSanityPage: mergedSizeSanity,
  };
}

function persistSanityPrefs(state: SanityUiPrefs): void {
  writeLocalStorage(SANITY_PREFS_KEY, state);
}

type SanityState = SanityUiPrefs & {
  /** Session-only season override — not persisted to localStorage. Defaults to globalSettings.season. */
  seasonOverride: number | null;
};

const sanitySlice = createSlice({
  name: "sanity",
  initialState: { ...getStoredSanityPrefs(), seasonOverride: null } as SanityState,
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
    markCustomerSanityFinished(state, action: PayloadAction<number>) {
      const custId = action.payload;
      if (!state.customerSanityPage.finishedCustIds.includes(custId)) {
        state.customerSanityPage.finishedCustIds.push(custId);
        state.customerSanityPage.finishedAt = new Date().toISOString();
        persistSanityPrefs(state);
      }
    },
    unmarkCustomerSanityFinished(state, action: PayloadAction<number>) {
      const custId = action.payload;
      const idx = state.customerSanityPage.finishedCustIds.indexOf(custId);
      if (idx !== -1) {
        state.customerSanityPage.finishedCustIds.splice(idx, 1);
        state.customerSanityPage.finishedAt = new Date().toISOString();
        persistSanityPrefs(state);
      }
    },
    clearCustomerSanityFinished(state) {
      state.customerSanityPage.finishedCustIds = [];
      state.customerSanityPage.finishedAt = null;
      persistSanityPrefs(state);
    },

    // --- programSanityPage ---
    setSelectedProgCodeId(state, action: PayloadAction<string | null>) {
      state.programSanityPage.selectedProgCodeId = action.payload;
      persistSanityPrefs(state);
    },
    markProgramSanityFinished(state, action: PayloadAction<number>) {
      const progId = action.payload;
      if (!state.programSanityPage.finishedProgIds.includes(progId)) {
        state.programSanityPage.finishedProgIds.push(progId);
        state.programSanityPage.finishedAt = new Date().toISOString();
        persistSanityPrefs(state);
      }
    },
    unmarkProgramSanityFinished(state, action: PayloadAction<number>) {
      const progId = action.payload;
      const idx = state.programSanityPage.finishedProgIds.indexOf(progId);
      if (idx !== -1) {
        state.programSanityPage.finishedProgIds.splice(idx, 1);
        state.programSanityPage.finishedAt = new Date().toISOString();
        persistSanityPrefs(state);
      }
    },
    clearProgramSanityFinished(state) {
      state.programSanityPage.finishedProgIds = [];
      state.programSanityPage.finishedAt = null;
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

    // --- session-only ---
    setSeasonOverride(state, action: PayloadAction<number>) {
      state.seasonOverride = action.payload;
      // Not persisted — session only
    },
  },
});

export const sanityActions = sanitySlice.actions;
export const sanityReducer = sanitySlice.reducer;
