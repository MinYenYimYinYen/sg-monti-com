import { createSlice } from "@reduxjs/toolkit";
import { Company } from "@/app/realGreen/company/_lib/CompanyTypes";
import { CompanyContract } from "@/app/realGreen/company/api/CompanyContract";
import { companyFunc } from "@/app/realGreen/company/_lib/companyFunc";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

export const getCompanies = createStandardThunk<CompanyContract, "getAll">({
  typePrefix: "company/getCompanies",
  apiPath: "/realGreen/company/api",
  opName: "getAll",
});

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
