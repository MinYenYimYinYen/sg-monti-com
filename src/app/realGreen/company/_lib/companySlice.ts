import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Company } from "@/app/realGreen/company/_lib/Company";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { CompanyContract } from "@/app/realGreen/company/_lib/CompanyContract";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { api } from "@/lib/api/api";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { Grouper } from "@/lib/Grouper";
import { companyFunc } from "@/app/realGreen/company/_lib/companyFunc";

export const getCompanies = createAsyncThunk<
  Company[], // Return Data Only
  WithConfig<CompanyContract["getAll"]["params"]>,
  { rejectValue: string }
>(
  "company/getCompanies",
  async (params, { rejectWithValue }) => {
    const { showLoading, loadingMsg, ...apiParams } = params;
    const body: OpMap<CompanyContract> = {
      op: "getAll",
      ...apiParams,
    };

    const res = await api<CompanyContract["getAll"]["result"]>(
      "/realGreen/company/api",
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
      state.companies = action.payload;
    });
  },
  selectors: {
    allCompanies: (state) => state.companies,
    company: (state) => companyFunc.chooseDefault(state.companies),
  },
});

export const companyActions = { ...companySlice.actions, getCompanies };
export const companySelect = { ...companySlice.selectors };
export default companySlice.reducer;
