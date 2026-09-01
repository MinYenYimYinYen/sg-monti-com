import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CustomerSanitySortMode = "byCustomerCount" | "byProgCodeCount";
export type CustomerSanitySortDirection = "asc" | "desc";

const EXCLUDED_PROG_CODE_IDS_KEY = "customerSanity.excludedProgCodeIds";

function getStoredExcludedProgCodeIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(EXCLUDED_PROG_CODE_IDS_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

export function persistExcludedProgCodeIds(ids: string[]): void {
  try {
    localStorage.setItem(EXCLUDED_PROG_CODE_IDS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

type SanityState = {
  programSanity: {
    selectedProgCodeId: string | null;
  };
  customerSanity: {
    excludedProgCodeIds: string[];
    sortMode: CustomerSanitySortMode;
    sortDirection: CustomerSanitySortDirection;
  };
};

const initialState: SanityState = {
  programSanity: {
    selectedProgCodeId: null,
  },
  customerSanity: {
    excludedProgCodeIds: getStoredExcludedProgCodeIds(),
    sortMode: "byCustomerCount",
    sortDirection: "asc",
  },
};

const sanitySlice = createSlice({
  name: "sanity",
  initialState,
  reducers: {
    setSelectedProgCodeId(state, action: PayloadAction<string | null>) {
      state.programSanity.selectedProgCodeId = action.payload;
    },
    toggleExcludedProgCodeId(state, action: PayloadAction<string>) {
      const id = action.payload;
      const idx = state.customerSanity.excludedProgCodeIds.indexOf(id);
      if (idx === -1) {
        state.customerSanity.excludedProgCodeIds.push(id);
      } else {
        state.customerSanity.excludedProgCodeIds.splice(idx, 1);
      }
      persistExcludedProgCodeIds(state.customerSanity.excludedProgCodeIds);
    },
    clearExcludedProgCodeIds(state) {
      state.customerSanity.excludedProgCodeIds = [];
      persistExcludedProgCodeIds([]);
    },
    setSortMode(state, action: PayloadAction<CustomerSanitySortMode>) {
      state.customerSanity.sortMode = action.payload;
    },
    setSortDirection(state, action: PayloadAction<CustomerSanitySortDirection>) {
      state.customerSanity.sortDirection = action.payload;
    },
  },
});

export const sanityActions = sanitySlice.actions;
export const sanityReducer = sanitySlice.reducer;
