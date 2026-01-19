import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ProgCode } from "@/app/realGreen/progCode/_lib/ProgCode";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { ProgCodeContract } from "@/app/realGreen/progCode/_lib/ProgCodeContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

export const getProgCodes = createAsyncThunk<
  ProgCode[],
  WithConfig<ProgCodeContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "progCode/getProgCodes",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<ProgCodeContract> = { op: "getAll", ...params };

    const res = await api<ProgCodeContract["getAll"]["result"]>(
      "/realGreen/programCode/api",
      {
        method: "POST",
        body,
      },
    );

    if (!res.success) {
      return rejectWithValue(res.message);
    }

    return res.items;
  },
  smartThunkOptions({ typePrefix: "progCode/getProgCodes" }),
);

interface ProgCodeState {
  progCodes: ProgCode[];
}

const initialState: ProgCodeState = {
  progCodes: [],
};

const progCodeSlice = createSlice({
  name: "progCode",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getProgCodes.fulfilled, (state, action) => {
      state.progCodes = action.payload;
    });
  },
  selectors: {
    allProgCodes: (state) => state.progCodes,
    activeProgCodes: (state) => state.progCodes.filter((p) => p.available),
    progCodeMap: (state) =>
      new Grouper(state.progCodes).toUniqueMap((c) => c.progCodeId),
  },
});

export const progCodeActions = { ...progCodeSlice.actions, getProgCodes };
export const progCodeSelect = { ...progCodeSlice.selectors };
export default progCodeSlice.reducer;
