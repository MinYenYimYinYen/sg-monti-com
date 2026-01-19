import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ServCodeWithMongo } from "@/app/realGreen/progServMeta/_lib/types/ServCode";
import { ProgServ } from "@/app/realGreen/progServMeta/_lib/types/ProgServ";
import { ProgServMetaContract } from "@/app/realGreen/progServMeta/_lib/types/ProgServMetaContract";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { ProgCodeWithMongo } from "@/app/realGreen/progServMeta/_lib/types/ProgCode";

// --- Thunks ---

export const fetchDryProgCodes = createAsyncThunk<
  ProgServMetaContract["getProgCodes"]["result"]["items"], // Return Data Only
  WithConfig<ProgServMetaContract["getProgCodes"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchDryProgCodes",
  async ({ params }, { rejectWithValue }) => {
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
  ProgServMetaContract["getServCodes"]["result"]["items"], // Return Data Only
  WithConfig<ProgServMetaContract["getServCodes"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchDryServCodes",
  async ({ params }, { rejectWithValue }) => {
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
  ProgServMetaContract["syncProgServ"]["result"]["items"],
  WithConfig<ProgServMetaContract["syncProgServ"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchProgServs",
  async ({ params }, { rejectWithValue }) => {
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
  dryProgCodes: ProgCodeWithMongo[];
  dryServCodes: ServCodeWithMongo[];
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
});

export const progServMetaActions = {
  ...progServMetaSlice.actions,
  fetchDryProgCodes,
  fetchDryServCodes,
  fetchProgServs,
};
export default progServMetaSlice.reducer;
