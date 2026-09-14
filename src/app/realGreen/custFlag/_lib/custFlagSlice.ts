import { FlagIdCustIds } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CustFlagContract } from "@/app/realGreen/custFlag/api/CustFlagContract";

const STORAGE_KEY = "selectedFlagIds";

function getStoredFlagIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as number[]) : [];
  } catch {
    return [];
  }
}

export function persistFlagIds(ids: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

type CustFlagState = {
  flagIdCustIds: Map<number, FlagIdCustIds>;
  selectedFlagIds: number[];
};

const initialState: CustFlagState = {
  flagIdCustIds: new Map(),
  selectedFlagIds: getStoredFlagIds(),
};

const custFlagSlice = createSlice({
  name: "custFlag",
  initialState,
  reducers: {
    setSelectedFlagIds: (state, action) => {
      state.selectedFlagIds = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadFlagIdCustIds.fulfilled, (state, action) => {
      for (const newData of action.payload) {
        state.flagIdCustIds.set(newData.flagId, newData);
      }
    });

    /**
     * After refreshing a single customer's flags from RealGreen, update
     * flagIdCustIds by adding or removing the custId from each entry based
     * on whether that flag is currently present on the customer.
     */
    builder.addCase(refreshCustFlags.fulfilled, (state, action) => {
      const { custId, presentFlagIds } = action.payload;
      const presentSet = new Set(presentFlagIds);

      for (const [flagId, entry] of state.flagIdCustIds) {
        const hasCust = entry.custIds.includes(custId);
        const shouldHave = presentSet.has(flagId);

        if (shouldHave && !hasCust) {
          state.flagIdCustIds.set(flagId, {
            ...entry,
            custIds: [...entry.custIds, custId],
          });
        } else if (!shouldHave && hasCust) {
          state.flagIdCustIds.set(flagId, {
            ...entry,
            custIds: entry.custIds.filter((id) => id !== custId),
          });
        }
      }
    });
  },
});

const loadFlagIdCustIds = createStandardThunk<CustFlagContract, "loadFlagIdCustIds">({
  typePrefix: "custFlag/loadFlagIdCustIds",
  apiPath: "/realGreen/custFlag/api",
  opName: "loadFlagIdCustIds",
});

/**
 * Refreshes custFlag state for a single customer by fetching their current
 * flags from RealGreen and reconciling against the flagIds already in state.
 * Dispatched automatically by custFlagListeners after any refreshCustomer action.
 */
const refreshCustFlags = createStandardThunk<CustFlagContract, "refreshCustFlags">({
  typePrefix: "custFlag/refreshCustFlags",
  apiPath: "/realGreen/custFlag/api",
  opName: "refreshCustFlags",
});

export const custFlagActions = { ...custFlagSlice.actions, loadFlagIdCustIds, refreshCustFlags };
export default custFlagSlice.reducer;
