import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { handleError } from "@/lib/errors/errorHandler";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { CustomerContract } from "@/app/realGreen/customer/_lib/types/CustomerContract";

export const runSearchScheme = createAsyncThunk<
  CustomerContract["runSearchScheme"]["result"]["items"],
  WithConfig<CustomerContract["runSearchScheme"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "sanity/getDocs",
  async (withConfig, { rejectWithValue }) => {
    try {

      const apiParams = withConfig.params

      const body: OpMap<CustomerContract> = {
        op: "runSearchScheme",
        ...apiParams,
      };

      const result = await api<CustomerContract["runSearchScheme"]["result"]>(
        "/realGreen/customer/api",
        {
          method: "POST",
          body,
        },
      );
      if (!result.success) {
        return rejectWithValue(result.message);
      }
      return result.items;
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "sanity/getDocs" }),
);

type SanityState = {};

const initialState: SanityState = {};

export const SanitySlice = createSlice({
  name: "Sanity",
  initialState,
  reducers: {},
  extraReducers: (builder) => {},
  selectors: {},
});

export default SanitySlice.reducer;
export const SanityActions = { ...SanitySlice.actions };
export const SanitySelect = { ...SanitySlice.selectors };
