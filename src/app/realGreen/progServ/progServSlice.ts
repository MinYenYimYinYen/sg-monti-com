import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import { ProgServ } from "@/app/realGreen/progServMeta/_lib/types/ProgServ";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { ProgServContract } from "@/app/realGreen/progServ/ProgServContract";

export const getProgServ = createAsyncThunk<
  ProgServ,
  WithConfig<ProgServContract["getOne"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "progServ/getProgServ",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<ProgServContract> = {
      op: "getOne",
      ...params,
    };

    const res = await api<ProgServContract["getOne"]["result"]>(
      "/realGreen/progServ/api",
      {
        method: "POST",
        body,
      },
    );

    if (!res.success) {
      return rejectWithValue(res.message);
    }

    return res.item;
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
