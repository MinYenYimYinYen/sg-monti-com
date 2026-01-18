import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import { ProgServ } from "@/app/realGreen/progServ/ProgServ";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { handleError } from "@/lib/errors/errorHandler";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { ProgServContract } from "@/app/realGreen/progServ/ProgServContract";

export const getProgServ = createAsyncThunk<
  ProgServContract["getOne"]["result"],
  WithConfig<ProgServContract["getOne"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServ/getProgServ",
  async (params, { rejectWithValue }) => {
    try {
      // 1. Separate Config params from API params
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;

      // 2. Type-Safe Body Construction
      const body: OpMap<ProgServContract> = {
        op: "getOne",
        ...apiParams,
      };

      return await api<ProgServContract["getOne"]["result"]>(
        "/realGreen/progServ/api",
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
  smartThunkOptions({ typePrefix: "progServ/getProgServ" }),
);

type ProgServState = {
  progServs: ProgServ[];
};

const initialState: ProgServState = {
  progServs: [],
};

export const progServSlice = createSlice({
  name: "progServ",
  initialState,
  reducers: {},
  extraReducers: (builder) => {},
  selectors: {},
});

export default progServSlice.reducer;
export const progServActions = { ...progServSlice.actions };
export const progServSelect = { ...progServSlice.selectors };
