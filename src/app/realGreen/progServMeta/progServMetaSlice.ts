import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ServCode } from "@/app/realGreen/servCode/ServCode";
import { ProgServ } from "@/app/realGreen/progServ/ProgServ";
import { ProgServMetaContract } from "@/app/realGreen/progServMeta/_lib/ProgServMetaContract";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { handleError } from "@/lib/errors/errorHandler";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { ProgCode } from "@/app/realGreen/progCode/_lib/ProgCode";

// --- Thunks ---

export const fetchDryProgCodes = createAsyncThunk<
  ProgServMetaContract["getProgCodes"]["result"],
  WithConfig<{}>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchDryProgCodes",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<ProgServMetaContract> = {
        op: "getProgCodes",
        ...apiParams,
      };

      return await api<ProgServMetaContract["getProgCodes"]["result"]>(
        "/realGreen/progServMeta/api",
        {
          method: "POST",
          body,
        },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "progServMeta/fetchDryProgCodes" }),
);

export const fetchDryServCodes = createAsyncThunk<
  ProgServMetaContract["getServCodes"]["result"],
  WithConfig<{}>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchDryServCodes",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<ProgServMetaContract> = {
        op: "getServCodes",
        ...apiParams,
      };

      return await api<ProgServMetaContract["getServCodes"]["result"]>(
        "/realGreen/progServMeta/api",
        {
          method: "POST",
          body,
        },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "progServMeta/fetchDryServCodes" }),
);

export const fetchProgServs = createAsyncThunk<
  ProgServMetaContract["syncProgServ"]["result"],
  WithConfig<ProgServMetaContract["syncProgServ"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchProgServs",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<ProgServMetaContract> = {
        op: "syncProgServ",
        ...apiParams,
      };

      return await api<ProgServMetaContract["syncProgServ"]["result"]>(
        "/realGreen/progServMeta/api",
        {
          method: "POST",
          body,
        },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
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
      state.dryProgCodes = action.payload.items;
    });
    builder.addCase(fetchDryServCodes.fulfilled, (state, action) => {
      state.dryServCodes = action.payload.items;
    });
    builder.addCase(fetchProgServs.fulfilled, (state, action) => {
      state.progServLinks = action.payload.items;
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
