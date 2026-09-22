import { FlagIdCustIds } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";
import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { CustFlagContract } from "@/app/realGreen/custFlag/api/CustFlagContract";
import { CustFlagAddContract } from "@/app/realGreen/custFlag/add/CustFlagAddContract";
import { readLocalStorage, writeLocalStorage } from "@/lib/misc/localStorageUtils";

const STORAGE_KEY = "selectedFlagIds";

function getStoredFlagIds(): number[] {
  return readLocalStorage<number[]>(STORAGE_KEY, []);
}

export function persistFlagIds(ids: number[]): void {
  writeLocalStorage(STORAGE_KEY, ids);
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
     * On a successful flag add, optimistically add the custIds to the
     * flagIdCustIds entry for the given flagId. RealGreen silently skips
     * invalid custIds, so the UI layer is responsible for only sending valid ones.
     */
    builder.addCase(addCustFlag.fulfilled, (state, action) => {
      const { custIds, flagId } = action.payload;
      const existing = state.flagIdCustIds.get(flagId);
      if (!existing) return;

      const custIdSet = new Set(existing.custIds);
      for (const custId of custIds) {
        custIdSet.add(custId);
      }
      state.flagIdCustIds.set(flagId, { ...existing, custIds: [...custIdSet] });
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

const addCustFlag = createStandardThunk<CustFlagAddContract, "addCustFlag">({
  typePrefix: "custFlag/addCustFlag",
  apiPath: "/realGreen/custFlag/add/api",
  opName: "addCustFlag",
});

export const custFlagActions = { ...custFlagSlice.actions, loadFlagIdCustIds, refreshCustFlags, addCustFlag };
export default custFlagSlice.reducer;
