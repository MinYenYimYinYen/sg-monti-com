# Architecture: Unified Error Handling

This project uses a **Unified Error Class** and a **Functional Handler** pattern. This replaces legacy subclass hierarchies with a single, portable, and serializable error object that behaves consistently across Server, Client, and API layers.

---

## 1. The Core: `AppError`

We use a single custom error class that carries context via properties rather than inheritance.

**Location:** `src/lib/errors/AppError.ts`

### Error Types
| Type | Status | Description |
| :--- | :--- | :--- |
| `API_ERROR` | 400-500 | Standard failures from our own Next.js API Routes. |
| `EXTERNAL_ERROR` | Varies | Failures from 3rd party APIs (e.g., RealGreen). **Note:** These should be caught server-side and converted to 502s. |
| `AUTH_ERROR` | 401/403 | Authentication or Authorization failures. |
| `VALIDATION_ERROR` | 400 | Invalid user input or bad request data. |
| `NETWORK_ERROR` | 0 | DNS resolution, Offline status, or Request Timeouts. |
| `SERVER_ERROR` | 500 | Unexpected crashes or database failures. |

---

## 2. Operational vs. Non-Operational Errors

We use the `isOperational` boolean to distinguish between **Expected Runtime Errors** and **Bugs**. This flag dictates UI sanitization.

### Logic Flow: How is it set?
You rarely set this manually. It is determined automatically based on the *source* of the error.

1.  **TRUE (Expected/Operational):**
   * **Source:** The `api.ts` wrapper.
   * **Mechanism:** When the API returns a 4xx/5xx status, the wrapper explicitly throws `new AppError(..., true)`.
   * **Meaning:** "We anticipated this might happen (e.g., Validation Failed)."

2.  **FALSE (Unexpected/Bug):**
   * **Source:** The `normalizeError` function in `errorHandler.ts`.
   * **Mechanism:** If the handler catches a generic JS `Error` (e.g., `TypeError`, `ReferenceError`), it wraps it in a new `AppError` with `isOperational: false`.
   * **Meaning:** "Something broke in the code (e.g., cannot read property of undefined)."

---

## 3. The Handler: `handleError`

**Location:** `src/lib/errors/errorHandler.ts`

This pure function handles side effects (Logging & Toasting) based on the environment and the `isOperational` flag.

### A. Normalization
It converts any input (`unknown`) into an `AppError`. If the input is already an `AppError` (from `api.ts`), it is passed through unchanged (preserving `isOperational: true`).

### B. Logging (Server & Client)
* **Server:** Always logs full stack traces and data for debugging.
* **Client:** Logs clean messages to the console.

### C. Toasting (UI Sanitization)
This is where `isOperational` is critical.
* **If `isOperational: true`:** The user sees the actual message (e.g., "Email is required").
* **If `isOperational: false`:** The user sees a sanitized generic message ("An unexpected error occurred") to prevent leaking technical details or confusing non-technical users.

---

## 4. Usage Patterns

### A. Client-Side Components
Use `try/catch` with `handleError`. You do not need to check `isOperational` manually; the handler does it for you.

```typescript
const handleSave = async () => {
  try {
    await api.post("/lawn-care", data); // Throws AppError(true) on 400
  } catch (err) {
    // If API error: Toasts "Invalid Data"
    // If Code bug: Toasts "Unexpected Error"
    handleError(err);
  }
};
```

### B. Redux Async Thunks
Catch the error, handle side effects, and reject with a clean string.

```typescript
const getEmployees = createAsyncThunk(..., async (params, { rejectWithValue }) => {
  try {
    return await api("/employee", ...);
  } catch (e) {
    const error = handleError(e);
    return rejectWithValue(error.message);
  }
});
```

### C. Server-Side Routes (The Two-Hop)
1.  `rgApi` (Server-only) throws `EXTERNAL_ERROR`.
2.  Route Handler catches it, logs it, and returns HTTP 502.
3.  Client receives 502, throws `API_ERROR`.

```typescript
// src/app/api/route.ts
export async function POST() {
   try {
      await rgApi(...);
   } catch (e) {
      const error = normalizeError(e);
      console.error(`[${error.type}]`, error); // Log real error
      return Response.json({ success: false }, { status: 502 }); // Return safe error
   }
}
```