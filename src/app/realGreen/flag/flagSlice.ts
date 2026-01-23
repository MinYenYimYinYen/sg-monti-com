import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Flag } from "@/app/realGreen/flag/Flag";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { FlagContract } from "@/app/realGreen/flag/api/FlagContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";

export const getFlags = createAsyncThunk<
  Flag[],
  WithConfig<FlagContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "flag/getFlags",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<FlagContract> = {
      op: "getAll",
      ...params,
    };

    const res = await api<FlagContract["getAll"]["result"]>(
      "/realGreen/flag/api",
      {
        method: "POST",
        body,
      },
    );

    if (!res.success) {
      return rejectWithValue(res.message);
    }

    return res.payload;
  },
  smartThunkOptions({ typePrefix: "flag/getFlags" }),
);

interface FlagState {
  flags: Flag[];
}

const initialState: FlagState = {
  flags: [],
};

const flagSlice = createSlice({
  name: "flag",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getFlags.fulfilled, (state, action) => {
      state.flags = action.payload;
    });
  },
  selectors: {
    allFlags: (state) => state.flags,
    activeFlags: (state) => state.flags.filter((flag) => flag.available),
    flagMap: (state) => new Grouper(state.flags).toUniqueMap((f) => f.flagId),
  },
});

export const flagActions = { ...flagSlice.actions, getFlags };
export const flagSelect = { ...flagSlice.selectors };
export default flagSlice.reducer;
