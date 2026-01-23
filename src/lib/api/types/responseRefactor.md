# Response Refactor Plan

The goal is to standardize all API responses to use a single `payload` property for data, replacing `item` and `items`. This enables generic Thunk factories.

## 1. Type Definitions (`src/lib/api/types/responses.ts`)
- [ ] Deprecate `ObjResponse<T>` and `ArrayResponse<T>`.
- [ ] Create `DataResponse<T> = SuccessResponse & { payload: T }`.
- [ ] Update `ApiResponse<T>` to use `DataResponse<T>`.

## 2. API Routes (Server-Side)
Update all API routes to return `{ success: true, payload: data }` instead of `item` or `items`.

- [ ] `src/app/auth/api/route.ts` (Login, CheckAuth, etc.)
- [ ] `src/app/realGreen/employee/api/route.ts` (if exists)
- [ ] `src/app/realGreen/customer/api/route.ts` (Streaming route might be exempt or needs `payload` in chunks?)
    - *Note:* Streaming chunks currently use specific keys like `dryCustomers`. We might want to standardize chunks too, e.g., `{ payload: { customers: [] } }`.

## 3. Client-Side API Wrapper (`src/lib/api/api.ts`)
- [ ] Ensure `api<T>` correctly types the return value as `DataResponse<T>`.

## 4. Thunks (Client-Side)
Update all `createAsyncThunk` definitions to read from `.payload`.

- [ ] `src/app/auth/authSlice.ts` (Login, etc.)
- [ ] `src/app/realGreen/employee/employeeSlice.ts`
- [ ] `src/app/sanity/sanitySlice.ts` (Streaming thunk)

## 5. Generic Thunk Factories (`src/store/reduxUtil/thunkFactories.ts`)
Create reusable factories to eliminate boilerplate.

- [ ] `createStandardThunk<TParams, TResult>`:
    - Automatically calls `api`.
    - Automatically returns `res.payload`.
    - Handles `smartThunkOptions`.
- [ ] `createStreamThunk<TParams, TChunk>`:
    - Automatically calls `apiStream`.
    - Automatically reads NDJSON.
    - Dispatches to a provided `onChunk` action.

## 6. Cleanup
- [ ] Remove `ObjResponse` and `ArrayResponse` types once all references are gone.
