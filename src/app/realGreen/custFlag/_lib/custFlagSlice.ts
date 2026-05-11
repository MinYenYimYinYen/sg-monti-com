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
  },
});

const loadFlagIdCustIds = createStandardThunk<
  CustFlagContract,
  "loadFlagIdCustIds"
>({
  typePrefix: "custFlag/loadFlagIdCustIds",
  apiPath: "/realGreen/custFlag/api",
  opName: "loadFlagIdCustIds",
});

export const custFlagActions = { ...custFlagSlice.actions, loadFlagIdCustIds };
export default custFlagSlice.reducer;
