import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ServCode } from "@/app/realGreen/servCode/ServCode";
import { ProgServ } from "@/app/realGreen/progServ/ProgServ";
import { ProgServMetaContract } from "@/app/realGreen/progServMeta/_lib/ProgServMetaContract";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { ProgCode } from "@/app/realGreen/progCode/_lib/ProgCode";
import { ServCodeContract } from "@/app/realGreen/servCode/api/ServCodeContract";
import { ProgCodeContract } from "@/app/realGreen/progCode/_lib/ProgCodeContract";

// --- Thunks ---

export const fetchDryProgCodes = createAsyncThunk<
  ProgCode[], // Return Data Only
  WithConfig<ProgCodeContract["getAll"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchDryProgCodes",
  async (params, { rejectWithValue }) => {
    const body: OpMap<ProgServMetaContract> = {
      op: "getProgCodes",
      ...params,
    };

    const res = await api<ProgServMetaContract["getProgCodes"]["result"]>(
      "/realGreen/progServMeta/api",
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
  smartThunkOptions({ typePrefix: "progServMeta/fetchDryProgCodes" }),
);

export const fetchDryServCodes = createAsyncThunk<
  ServCode[], // Return Data Only
  WithConfig<ServCodeContract["getAll"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchDryServCodes",
  async (params, { rejectWithValue }) => {
    const body: OpMap<ProgServMetaContract> = {
      op: "getServCodes",
      ...params,
    };

    const res = await api<ProgServMetaContract["getServCodes"]["result"]>(
      "/realGreen/progServMeta/api",
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
  smartThunkOptions({ typePrefix: "progServMeta/fetchDryServCodes" }),
);

export const fetchProgServs = createAsyncThunk<
  ProgServ[], // Return Data Only
  WithConfig<ProgServMetaContract["syncProgServ"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchProgServs",
  async (params, { rejectWithValue }) => {
    const body: OpMap<ProgServMetaContract> = {
      op: "syncProgServ",
      ...params,
    };

    const res = await api<ProgServMetaContract["syncProgServ"]["result"]>(
      "/realGreen/progServMeta/api",
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
  smartThunkOptions({ typePrefix: "progServMeta/fetchProgServs" }),
);

// --- Slice ---

interface ProgServMetaState {
  dryProgCodes: ProgCode[];
  dryServCodes: ServCode[];
  progServLinks: ProgServ[];
}

const initialState: ProgServMetaState = {
  dryProgCodes: [],
  dryServCodes: [],
  progServLinks: [],
};

const progServMetaSlice = createSlice({
  name: "progServMeta",
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
  selectors: {
    dryProgCodes: (state) => state.dryProgCodes,
    dryServCodes: (state) => state.dryServCodes,
    progServLinks: (state) => state.progServLinks,
  },
});

export const progServMetaActions = {
  ...progServMetaSlice.actions,
  fetchDryProgCodes,
  fetchDryServCodes,
  fetchProgServs,
};
export const progServMetaSelect = { ...progServMetaSlice.selectors };
export default progServMetaSlice.reducer;
