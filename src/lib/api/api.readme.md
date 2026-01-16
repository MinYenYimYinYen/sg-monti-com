# Architecture: API & RPC Pattern

This project uses a **Type-Safe RPC (Remote Procedure Call)** pattern. Instead of standard REST endpoints (GET/POST/PUT/DELETE on resources), we use **Operation-Based Contracts** that enforce strict input/output types, automated request body generation, and declarative security rules.

## 1. Core Definitions

### A. Roles (`src/lib/api/types/roles.ts`)
We use a single source of truth for user roles. "public" is treated as a role for unauthenticated access.
```typescript
export const ROLES = ["admin", "office", "tech", "public"] as const;
export type Role = (typeof ROLES)[number];
```

### B. Standard Responses (`src/lib/api/types/responses.ts`)
All API endpoints must return data in a standardized "envelope".
```typescript
export type ErrorResponse<T = unknown> = { success: false; message: string; silent?: boolean; ... };
export type SuccessResponse = { success: true };
export type ObjResponse<T> = SuccessResponse & { item: T };
export type ArrayResponse<T> = SuccessResponse & { items: T[] };
```

### C. The API Wrapper (`src/lib/api/api.ts`)
A wrapper around `fetch` that integrates with our **Unified Error Architecture**.
* **Auto-Stringify:** Accepts objects in `body` and handles `JSON.stringify`.
* **Error Parsing:** Automatically throws `AppError` (Operational=True) on non-2xx responses.
* **Type Safety:** Generic return types `api<ResultType>(...)`.

---

## 2. Infrastructure (`src/lib/api/types/rpcUtils.ts`)

These utility types connect the "Contract" to the Server and Client.

* **`OpMap`**: Generates a Discriminated Union of all valid Request Bodies (e.g., `{ op: 'getAll', ...params } | { op: 'postOne', ... }`). It supports both `type` and `interface` definitions.
* **`HandlerMap`**: Enforces that every server handler defines **both**:
    1.  **`roles`**: An explicit array of allowed user roles.
    2.  **`handler`**: The async function executing the logic.

---

## 3. Workflow Example: Employee Feature

To add a new feature, follow this 3-step process.

### Step 1: Define the Contract
Create a file defining the Inputs (`params`) and Outputs (`result`) for each operation.

**`src/app/realGreen/employee/api/EmployeeContract.ts`**
```typescript
import { ObjResponse, ArrayResponse, SuccessResponse } from '@/lib/api/types/responses';

export interface EmployeeContract {
  // Op: getAll
  getAll: {
    params: { region?: string }; 
    result: ArrayResponse<Employee>; 
  };
  
  // Op: postOne
  postOne: {
    params: { employee: EmployeeExt };
    result: ObjResponse<Employee>;   
  };
}
```

### Step 2: Server-Side Implementation (The Gateway)
Implement the logic using `HandlerMap`. This acts as the **"First Hop"** in our error architecture—catching upstream errors (RealGreen/DB), logging them, and returning safe status codes.

**`src/app/realGreen/employee/api/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { EmployeeContract } from "./EmployeeContract";
import { assertRole } from "@/app/auth/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";

const handlers: HandlerMap<EmployeeContract> = {
  getAll: {
    roles: ["office", "admin"], 
    handler: async (params) => {
      // Logic (DB or RealGreen API)
      return { success: true, items: [] };
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    // 1. Strict Typing (OpMap ensures body matches contract)
    const body = (await req.json()) as OpMap<EmployeeContract>;
    const { op, ...params } = body;
    const config = handlers[op];

    if (!config) return NextResponse.json({ success: false, message: 'Invalid Op' }, { status: 400 });

    // 2. Security Check
    await assertRole(config.roles);

    // 3. Execution
    const result = await config.handler(params as any);
    return NextResponse.json(result);

  } catch (e) {
    // 4. "Two-Hop" Error Handling
    const error = normalizeError(e);
    console.error(`[API] ${error.type}: ${error.message}`, { stack: error.stack });

    // Map Errors to Status Codes
    let status = 500;
    if (error.type === "EXTERNAL_ERROR") status = 502; // Bad Gateway (RealGreen failed)
    else if (error.type === "AUTH_ERROR") status = 403;
    else if (error.type === "VALIDATION_ERROR") status = 400;

    return NextResponse.json(
      { success: false, message: error.isOperational ? error.message : "Server Error" },
      { status }
    );
  }
}
```

### Step 3: Client-Side Usage (Redux Thunk)
The Thunk acts as the bridge. It segregates **UI Parameters** (for the global spinner) from **API Parameters** (for the contract).

**`src/lib/features/employee/employeeSlice.ts`**
```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api/api';
import { OpMap } from '@/lib/api/types/rpcUtils';
import { EmployeeContract } from '@/app/realGreen/employee/api/EmployeeContract';
import { WithConfig } from '@/store/reduxUtil/reduxTypes';
import { getUIMeta } from '@/store/reduxUtil/smartThunkOptions';

export const getEmployees = createAsyncThunk<
  EmployeeContract['getAll']['result'],          // Return Type
  WithConfig<EmployeeContract['getAll']['params']>,  // Params (Wrapped with UI flags)
  { rejectValue: string }
>(
  'employee/getEmployees',
  async (params, { rejectWithValue }) => {
    try {
      // 1. Segregate UI args from API args
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { showLoading, loadingMsg, ...apiParams } = params;

      // 2. Construct Type-Safe Body
      const body: OpMap<EmployeeContract> = {
        op: 'getAll',
        ...apiParams
      };

      return await api<EmployeeContract['getAll']['result']>('/employee/api', {
        method: 'POST',
        body // Passed as object (api wrapper stringifies it)
      });
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  { getPendingMeta: getUIMeta } // Hook up Global UI Spinner
);
```
