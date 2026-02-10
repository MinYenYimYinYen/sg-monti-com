# API Refactor Plan

## Goal
Standardize API error handling and response structure across the full stack (Server -> Client -> Redux -> UI).

## Core Principles
1.  **Universal Handler**: All API routes use a factory function (`createRpcHandler`) to ensure consistent logging, auth, and error formatting.
2.  **Structured Responses**: All responses (success or failure) follow a strict schema (`ApiResponse<T>`).
3.  **Return vs. Throw (Server-Side)**:
    *   **Expected Errors**: Handlers throw `AppError` (or return failure). The `createRpcHandler` catches these and returns a `200 OK` (or `4xx`) with `{ success: false, message: "..." }`.
    *   **Unexpected Errors**: The `createRpcHandler` catches these, logs the stack trace, and returns a `500` with `{ success: false, message: "Internal Server Error" }`.
4.  **Return vs. Throw (Client-Side `api.ts`)**:
    *   **`api()`**: Does **NOT** throw for handled server errors (even 4xx/5xx). It returns the `{ success: false }` object.
    *   **Exceptions**: Only throws for Network Errors or unparsable server crashes (e.g., HTML 502).
5.  **Redux Integration (`createStandardThunk`)**:
    *   **Bridge**: Acts as the adapter between the "Return" API and the "Rejected" Redux state.
    *   **Logic**:
        *   Calls `api()`.
        *   If `result.success === true` -> Returns payload (Thunk `fulfilled`).
        *   If `result.success === false` -> Calls `rejectWithValue(result.message)` (Thunk `rejected`).
    *   **Benefit**: Preserves existing slice logic (e.g., `authSlice` listening for `rejected`) while using the new structured API.

---

## Progress Checklist

### Infrastructure
- [x] **Step 1: Server-Side Standardization**
    - Create `src/lib/api/createRpcHandler.ts`
    - Implement `op` parsing, auth check, and error normalization.
    - Ensure JSON return for all errors.
    - **Key Feature**: Log `op` name on error for easier debugging.
- [x] **Step 2: Client-Side Fetch Wrapper**
    - Modify `src/lib/api/api.ts`
    - Update `api<T>()` to return `ErrorResponse` instead of throwing for structured errors.
- [x] **Step 3: Redux Thunk Factory**
    - Modify `src/store/reduxUtil/thunkFactories.ts`
    - Update `createStandardThunk` to handle the new `api()` return type.
    - Logic: `if (!res.success) return rejectWithValue(...)`.
- [x] **Step 4: Redux UI Slice**
    - Modify `src/store/reduxUtil/uiSlice.ts`
    - Verified: No changes needed (toasting handled by thunk factory).
- [x] **Step 5: Type Definitions**
    - Verify `src/lib/api/types/ApiContract.ts` compatibility.
    - Verified: No changes needed.

### Migration (Route Files)
Replace `export async function POST` with `createRpcHandler(handlers)`.

- [x] `src/app/auth/api/route.ts`
- [x] `src/app/realGreen/callAhead/api/route.ts`
- [x] `src/app/realGreen/company/api/route.ts`
- [x] `src/app/realGreen/conditionCode/api/route.ts`
- [x] `src/app/realGreen/customer/api/route.ts`
- [x] `src/app/realGreen/discount/api/route.ts`
- [x] `src/app/realGreen/employee/api/route.ts`
- [x] `src/app/realGreen/flag/api/route.ts`
- [x] `src/app/realGreen/priceTable/api/route.ts`
- [x] `src/app/realGreen/product/api/route.ts`
- [x] `src/app/realGreen/progServ/api/route.ts`
- [x] `src/app/realGreen/taxCode/api/route.ts`
- [x] `src/app/realGreen/zipCode/api/route.ts`

---

## Detailed Specs

### Step 1: Server-Side Standardization (`createRpcHandler`)

Create a factory function to replace the boilerplate `POST` function in `route.ts` files.

**Features:**
*   **Input**: `HandlerMap` (the definitions of operations).
*   **Logic**:
    *   Parses `op` from body.
    *   Validates `op` exists.
    *   Checks `roles` (Auth).
    *   Executes `handler`.
    *   **Error Handling**:
        *   Catches `AppError` (Expected): Returns JSON `{ success: false, ... }` with appropriate status code (4xx).
        *   Catches `Error` (Unexpected): Logs full stack trace. Returns JSON `{ success: false, message: "Internal Server Error" }` with status 500.
        *   **Crucial**: Always returns JSON. Never lets Next.js default HTML error page leak through (unless it's a crash outside the handler).

**File**: `src/lib/api/createRpcHandler.ts`

### Step 2: Client-Side Fetch Wrapper (`api.ts`)

Modify `src/lib/api/api.ts` to support the "Return, Don't Throw" pattern for structured errors.

**Changes:**
*   **`api<T>()`**:
    *   Perform `fetch`.
    *   If `res.ok`: Return JSON.
    *   If `!res.ok`:
        *   Attempt to parse JSON.
        *   If valid `ErrorResponse` (has `success: false`): **Return it** (do not throw).
        *   If parsing fails (e.g., Nginx 502 HTML): **Throw** `AppError` (Network/Server Error).
*   **Result**: The return type of `api<T>` is strictly `Promise<T | ErrorResponse>`.

### Step 3: Redux Thunk Factory (`thunkFactories.ts`)

Update `createStandardThunk` to bridge the gap between the "Return" API and "Rejected" Redux state.

**Changes:**
*   Call `api()`.
*   Check `result.success`.
*   If `false`:
    *   Call `handleError` (for Toast).
    *   Return `rejectWithValue(result.message)`.
*   If `true`:
    *   Return `result.payload`.

### Step 4: Redux UI Slice (`uiSlice.ts`)

Update the global UI handler to recognize "Success: False" payloads.

**Changes:**
*   **`isFulfilled` Matcher**:
    *   Check `action.payload`.
    *   If `payload.success === false`:
        *   Treat as error.
        *   Show Toast (unless `silent: true`).
        *   **Do not** record in `lastFetched`.
    *   If `payload.success === true`:
        *   Treat as success.
        *   Show Success Toast (if configured).
        *   Record `lastFetched`.
*   **`isRejected` Matcher**:
    *   Remains for Network Errors / Uncaught Exceptions.

### Step 5: Type Definitions (`ApiContract.ts`)

Ensure the contract types reflect that operations can return errors.

**Changes:**
*   Verify `ApiContract` allows `result` to be `SuccessResponse | ErrorResponse`. (Likely already compatible via `ApiResponse` union, but verify).

---

## Example Usage (Post-Refactor)

**Server (`route.ts`):**
```typescript
export const POST = createRpcHandler(handlers);
```

**Component:**
```typescript
const result = await dispatch(myThunk(params)).unwrap();
// unwrap() will throw if rejected, so we use try/catch or .catch()
// This matches standard Redux Toolkit usage.
```
