// import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
//
// import { searchScheme } from "@/app/realGreen/customer/_lib/searchSchemes/searchSchemes";
// import { WithConfig } from "@/store/reduxUtil/reduxTypes";
// import { AppState } from "@/store";
// import { OpMap } from "@/lib/api/types/rpcUtils";
// import { api } from "@/lib/api/api";
// import { handleError } from "@/lib/errors/errorHandler";
// import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
// import {
//   CustomerContract,
//   StreamChunk,
// } from "@/app/realGreen/customer/_lib/types/CustomerContract";
//
// function createRunSearchSchemeAsyncThunk(name: keyof typeof searchScheme) {
//   const runSearchScheme = createAsyncThunk<
//     CustomerContract["runSearchScheme"]["result"]["items"],
//     WithConfig<CustomerContract["runSearchScheme"]["params"]>,
//     { rejectValue: string; state: AppState }
//   >(
//     `${name}/getMongo`,
//     async ({ params }, { rejectWithValue }) => {
//       try {
//         // 2. Type-Safe Body Construction
//         const body: OpMap<CustomerContract> = {
//           op: "runSearchScheme",
//           ...params,
//         };
//
//         const response = await api<
//           CustomerContract["runSearchScheme"]["result"]
//         >("/realGreen/customer/api", {
//           method: "POST",
//           body,
//         });
//         if (!response.success) {
//           return rejectWithValue(response.message);
//         }
//         return response.items;
//       } catch (e) {
//         const error = handleError(e);
//         return rejectWithValue(error.message);
//       }
//     },
//     smartThunkOptions({ typePrefix: `${name}/runSearchScheme` }),
//   );
//   return runSearchScheme;
// }
//
// function handleSearchSchemePayload(
//   state: CustomerState,
//   action: PayloadAction<StreamChunk[]>,
// ) {
//   action.payload.forEach((chunk) => {
//     const { data } = chunk;
//     const { dryCustomers, dryPrograms, dryServices } = data;
//     if (dryCustomers) state.dryCustomers.push(...dryCustomers);
//     if (dryPrograms) state.dryPrograms.push(...dryPrograms);
//     if (dryServices) state.dryServices.push(...dryServices);
//   });
// }
//
// export const activeCustomersSlice = createSlice({
//   name: "ActiveCustomers",
//   initialState: initialCustomerState,
//   reducers: {},
//   extraReducers: (builder) => {
//     builder.addCase(activeCustomersSearch.fulfilled, (state, action) =>
//       handleSearchSchemePayload(state, action),
//     );
//   },
// });
//
// const activeCustomersSearch =
//   createRunSearchSchemeAsyncThunk("activeCustomers");
//
// export const activeCustomerReducer = activeCustomersSlice.reducer;
// export const activeCustomersActions = {
//   ...activeCustomersSlice.actions,
//   activeCustomersSearch,
// };
