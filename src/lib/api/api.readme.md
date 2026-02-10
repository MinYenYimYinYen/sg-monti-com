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
export type DataResponse<T> = SuccessResponse & { payload: T };
```

### C. The API Wrapper (`src/lib/api/api.ts`)
A wrapper around `fetch` that integrates with our **Unified Error Architecture**.
* **Auto-Stringify:** Accepts objects in `body` and handles `JSON.stringify`.
* **Errors as Data:** Returns `Promise<T | ErrorResponse>`. It does **not** throw for operational errors (e.g., Validation, Auth). Instead, it returns a 200 OK response with `success: false`.
* **Network Errors:** It *does* throw for network failures or unexpected server crashes (500s).
* **Streaming:** Use `apiStream` for endpoints that return NDJSON streams.

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

**Key Requirement:** Your contract interface **must** extend `ApiContract`. This enforces that every operation returns a valid `DataResponse` structure.

**`src/app/realGreen/employee/api/EmployeeContract.ts`**
```typescript
import { DataResponse } from '@/lib/api/types/responses';
import { ApiContract } from '@/lib/api/types/ApiContract';

// Extend ApiContract to enforce structure. 
export interface EmployeeContract extends ApiContract {
  // Op: getAll
  getAll: {
    params: { region?: string }; 
    result: DataResponse<Employee[]>; 
  };
}
```

### Step 2: Server-Side Implementation (The Gateway)
Implement the logic using `HandlerMap` and the universal `createRpcHandler`. This acts as the **"First Hop"** in our error architecture—catching upstream errors (RealGreen/DB), logging them with the operation name, and returning safe status codes.

**`src/app/realGreen/employee/api/route.ts`**
```typescript
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { EmployeeContract } from "./EmployeeContract";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<EmployeeContract> = {
  getAll: {
    roles: ["office", "admin"], 
    handler: async (params) => {
      // Logic (DB or RealGreen API)
      return { success: true, payload: [] };
    },
  },
};

// Use the factory function to create the POST handler
export const POST = createRpcHandler(handlers);
```

### Step 3: Client-Side Usage (Redux Thunk)
Use the `createStandardThunk` factory to generate a type-safe thunk.

**`src/lib/features/employee/employeeSlice.ts`**
```typescript
import { createStandardThunk } from '@/store/reduxUtil/thunkFactories';
import { EmployeeContract } from '@/app/realGreen/employee/api/EmployeeContract';

export const getEmployees = createStandardThunk<EmployeeContract, "getAll">({
  typePrefix: "employee/getEmployees",
  apiPath: "/realGreen/employee/api",
  opName: "getAll",
});
```
