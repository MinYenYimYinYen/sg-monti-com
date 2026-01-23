import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ServCodeWithMongo } from "@/app/realGreen/progServ/_lib/types/ServCode";
import { ProgServ } from "@/app/realGreen/progServ/_lib/types/ProgServ";
import { ProgServContract } from "@/app/realGreen/progServ/_lib/types/ProgServContract";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { ProgCodeWithMongo } from "@/app/realGreen/progServ/_lib/types/ProgCode";

// --- Thunks ---

export const fetchDryProgCodes = createAsyncThunk<
  ProgServContract["getProgCodes"]["result"]["payload"], // Return Data Only
  WithConfig<ProgServContract["getProgCodes"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServ/fetchDryProgCodes",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<ProgServContract> = {
      op: "getProgCodes",
      ...params,
    };

    const res = await api<ProgServContract["getProgCodes"]["result"]>(
      "/realGreen/progServ/api",
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
  smartThunkOptions({ typePrefix: "progServ/fetchDryProgCodes" }),
);

export const fetchDryServCodes = createAsyncThunk<
  ProgServContract["getServCodes"]["result"]["payload"], // Return Data Only
  WithConfig<ProgServContract["getServCodes"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServ/fetchDryServCodes",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<ProgServContract> = {
      op: "getServCodes",
      ...params,
    };

    const res = await api<ProgServContract["getServCodes"]["result"]>(
      "/realGreen/progServ/api",
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
  smartThunkOptions({ typePrefix: "progServ/fetchDryServCodes" }),
);

export const fetchProgServs = createAsyncThunk<
  ProgServContract["syncProgServ"]["result"]["payload"],
  WithConfig<ProgServContract["syncProgServ"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServ/fetchProgServs",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<ProgServContract> = {
      op: "syncProgServ",
      ...params,
    };

    const res = await api<ProgServContract["syncProgServ"]["result"]>(
      "/realGreen/progServ/api",
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
  smartThunkOptions({ typePrefix: "progServ/fetchProgServs" }),
);

// --- Slice ---

interface ProgServState {
  dryProgCodes: ProgCodeWithMongo[];
  dryServCodes: ServCodeWithMongo[];
  progServLinks: ProgServ[];
}

const initialState: ProgServState = {
  dryProgCodes: [],
  dryServCodes: [],
  progServLinks: [],
};

const progServSlice = createSlice({
  name: "progServ",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchDryProgCodes.fulfilled, (state, action) => {
      state.dryProgCodes = action.payload;
    });
    builder.addCase(fetchDryServCodes.fulfilled, (state, action) => {
      state.dryServCodes = action.payload;
    });
    builder.addCase(fetchProgServs.fulfilled, (state, action) => {
      state.progServLinks = action.payload;
    });
  },
});

export const progServActions = {
  ...progServSlice.actions,
  fetchDryProgCodes,
  fetchDryServCodes,
  fetchProgServs,
};
export default progServSlice.reducer;
