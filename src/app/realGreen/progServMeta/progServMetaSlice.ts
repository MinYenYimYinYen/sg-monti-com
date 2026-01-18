import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ServCode } from "@/app/realGreen/servCode/ServCode";
import { ProgServ } from "@/app/realGreen/progServ/ProgServ";
import { ServCodeContract } from "@/app/realGreen/servCode/api/ServCodeContract";
import { ProgServMetaContract } from "@/app/realGreen/progServMeta/_lib/ProgServMetaContract";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { handleError } from "@/lib/errors/errorHandler";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { OpMap } from "@/lib/api/types/rpcUtils";
import {ProgCode} from "@/app/realGreen/progCode/_lib/ProgCode";
import {ProgCodeContract} from "@/app/realGreen/progCode/_lib/ProgCodeContract";

// --- Thunks ---

export const fetchDryProgCodes = createAsyncThunk<
  ProgCodeContract["getAll"]["result"],
  WithConfig<{}>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchDryProgCodes",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<ProgCodeContract> = {
        op: "getAll",
        ...apiParams,
      };

      return await api<ProgCodeContract["getAll"]["result"]>(
        "/realGreen/programCode/api",
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
  ServCodeContract["getAll"]["result"],
  WithConfig<{}>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchDryServCodes",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<ServCodeContract> = {
        op: "getAll",
        ...apiParams,
      };

      return await api<ServCodeContract["getAll"]["result"]>(
        "/realGreen/servCode/api",
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
  ProgServMetaContract["sync"]["result"],
  WithConfig<ProgServMetaContract["sync"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServMeta/fetchProgServs",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<ProgServMetaContract> = {
        op: "sync",
        ...apiParams,
      };

      return await api<ProgServMetaContract["sync"]["result"]>(
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
