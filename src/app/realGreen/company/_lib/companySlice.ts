import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Company } from "@/app/realGreen/company/_lib/Company";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { CompanyContract } from "@/app/realGreen/company/_lib/CompanyContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { handleError } from "@/lib/errors/errorHandler";
import { Grouper } from "@/lib/Grouper";
import {companyFunc} from "@/app/realGreen/company/_lib/companyFunc";

export const getCompanies = createAsyncThunk<
  CompanyContract["getAll"]["result"],
  WithConfig<CompanyContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "company/getCompanies",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, ...apiParams } = params;
      const body: OpMap<CompanyContract> = {
        op: "getAll",
        ...apiParams,
      };

      return await api<CompanyContract["getAll"]["result"]>(
        "/realGreen/company/api",
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
  smartThunkOptions({ typePrefix: "company/getCompanies" }),
);

interface CompanyState {
  companies: Company[];
}

const initialState: CompanyState = {
  companies: [],
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCompanies.fulfilled, (state, action) => {
      state.companies = action.payload.items;
    });
  },
  selectors: {
    allCompanies: (state) => state.companies,
    company: (state) => companyFunc.chooseDefault(state.companies)

  },
});

export const companyActions = { ...companySlice.actions, getCompanies };
export const companySelect = { ...companySlice.selectors };
export default companySlice.reducer;
