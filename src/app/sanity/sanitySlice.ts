import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CustomerSanitySortMode = "byCustomerCount" | "byProgCodeCount";
export type CustomerSanitySortDirection = "asc" | "desc";

const SANITY_PREFS_KEY = "sanity.uiPrefs";

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
};

function getStoredSanityPrefs(): SanityUiPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const stored = localStorage.getItem(SANITY_PREFS_KEY);
    if (!stored) return defaultPrefs;
    const parsed = JSON.parse(stored) as Partial<SanityUiPrefs>;
    // Deep merge stored values over defaults so new fields get their defaults
    return {
      allPages: { ...defaultPrefs.allPages, ...parsed.allPages },
      customerSanityPage: { ...defaultPrefs.customerSanityPage, ...parsed.customerSanityPage },
      programSanityPage: { ...defaultPrefs.programSanityPage, ...parsed.programSanityPage },
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
  },
});

export const sanityActions = sanitySlice.actions;
export const sanityReducer = sanitySlice.reducer;
