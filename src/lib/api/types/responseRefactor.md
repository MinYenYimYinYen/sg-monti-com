# Response Refactor Plan

The goal is to standardize all API responses to use a single `payload` property for data, replacing `item` and `items`. This enables generic Thunk factories.

## 1. Type Definitions (`src/lib/api/types/responses.ts`)
- [x] Deprecate `ObjResponse<T>` and `ArrayResponse<T>`.
- [x] Create `DataResponse<T> = SuccessResponse & { payload: T }`.
- [x] Update `ApiResponse<T>` to use `DataResponse<T>`.

## 2. Contracts (Shared Types)
Update all Contracts to use `DataResponse<T>` instead of `ObjResponse` or `ArrayResponse`.

- [x] `src/app/auth/_types/AuthContract.ts`
- [x] `src/app/realGreen/employee/api/EmployeeContract.ts`
- [x] `src/app/realGreen/customer/_lib/types/CustomerContract.ts`
- [x] `src/app/realGreen/callAhead/api/CallAheadContract.ts`
- [x] `src/app/realGreen/company/_lib/CompanyContract.ts`
- [x] `src/app/realGreen/product/api/ProductContract.ts`
- [x] `src/app/realGreen/taxCode/api/TaxCodeContract.ts`
- [x] `src/app/realGreen/zipCode/api/ZipCodeContract.ts`
- [x] `src/app/realGreen/flag/api/FlagContract.ts`
- [x] `src/app/realGreen/priceTable/api/PriceTableContract.ts`
- [x] `src/app/realGreen/progServ/_lib/types/ProgServContract.ts`

## 3. API Routes (Server-Side)
Update all API routes to return `{ success: true, payload: data }` instead of `item` or `items`.

- [x] `src/app/auth/api/route.ts`
- [x] `src/app/realGreen/employee/api/route.ts`
- [x] `src/app/realGreen/customer/api/route.ts`
- [x] `src/app/realGreen/callAhead/api/route.ts`
- [x] `src/app/realGreen/company/api/route.ts`
- [x] `src/app/realGreen/product/api/route.ts`
- [x] `src/app/realGreen/taxCode/api/route.ts`
- [x] `src/app/realGreen/zipCode/api/route.ts`
- [x] `src/app/realGreen/flag/api/route.ts`
- [x] `src/app/realGreen/priceTable/api/route.ts`
- [x] `src/app/realGreen/progServ/api/route.ts`

## 4. Thunks (Client-Side)
Update all `createAsyncThunk` definitions to read from `.payload`.

- [x] `src/app/auth/authSlice.ts`
- [x] `src/app/realGreen/employee/employeeSlice.ts`
- [x] `src/app/sanity/sanitySlice.ts`
- [x] `src/app/realGreen/callAhead/callAheadSlice.ts`
- [x] `src/app/realGreen/company/_lib/companySlice.ts`
- [x] `src/app/realGreen/product/productSlice.ts`
- [x] `src/app/realGreen/taxCode/taxCodeSlice.ts`
- [x] `src/app/realGreen/zipCode/zipCodeSlice.ts`
- [x] `src/app/realGreen/flag/flagSlice.ts`
- [x] `src/app/realGreen/priceTable/priceTableSlice.ts`
- [x] `src/app/realGreen/progServ/progServSlice.ts`

## 5. Client-Side API Wrapper (`src/lib/api/api.ts`)
- [x] Ensure `api<T>` correctly types the return value as `DataResponse<T>`.

## 6. Generic Thunk Factories (`src/store/reduxUtil/thunkFactories.ts`)
Create reusable factories to eliminate boilerplate.

- [x] `createStandardThunk<TParams, TResult>`:
    - Automatically calls `api`.
    - Automatically returns `res.payload`.
    - Handles `smartThunkOptions`.
- [x] `createStreamThunk<TParams, TChunk>`:
    - Automatically calls `apiStream`.
    - Automatically reads NDJSON.
    - Dispatches to a provided `onChunk` action.

## 7. Cleanup
- [x] Remove `ObjResponse` and `ArrayResponse` types once all references are gone.
