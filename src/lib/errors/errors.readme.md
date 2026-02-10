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
| `UNKNOWN_ERROR` | 500 | Uncaught JS exceptions (Bugs). |

---

## 2. Operational vs. Non-Operational Errors

We use the `isOperational` boolean to distinguish between **Expected Runtime Errors** and **Bugs**. This flag dictates UI sanitization and Logging levels.

### Logic Flow: How is it set?
1.  **TRUE (Expected/Operational):**
   * **Source:** The `api.ts` wrapper or manual `throw new AppError(...)`.
   * **Meaning:** "We anticipated this might happen (e.g., Validation Failed, Wrong Password)."
   * **Logging:** Server logs these as `console.warn`.

2.  **FALSE (Unexpected/Bug):**
   * **Source:** The `normalizeError` function in `errorHandler.ts`.
   * **Mechanism:** If the handler catches a generic JS `Error` (e.g., `TypeError`, `MongoServerError`), it wraps it in a new `AppError` with `isOperational: false`.
   * **Stack Trace:** `normalizeError` **preserves the original stack trace** of the wrapped error, ensuring debugging points to the crash source.
   * **Logging:** Server logs these as `console.error` with full stack traces.

---

## 3. The Handler: `handleError`

**Location:** `src/lib/errors/errorHandler.ts`

This pure function handles side effects (Logging & Toasting) based on the environment and the `isOperational` flag.

### A. Toasting (UI Sanitization)
* **If `isOperational: true`:** The user sees the actual message (e.g., "Email is required").
* **If `isOperational: false`:** The user sees a sanitized generic message ("An unexpected error occurred") to prevent leaking technical details.

### B. Silent Handling Strategy
You can suppress the toast notification by passing `{ silent: true }`.

**Rule of Thumb:**
*   **Interactive Actions (Login, Save, Submit):** `silent: false` (Default). The user initiated an action and expects feedback, even if it failed.
*   **Background Actions (Check Auth, Refresh Token):** `silent: true`. If these fail (e.g., user is anonymous), we should not annoy the user with a red toast.

```typescript
// Example: Background check
dispatch(checkAuth({ config: { silentError: true } }));
```

---

## 4. Usage Patterns

### A. Client-Side Components
Use `try/catch` with `handleError`.

```typescript
const handleSave = async () => {
  try {
    const res = await api.post("/lawn-care", data); 
    if (!res.success) throw new AppError(res); 
  } catch (err) {
    handleError(err); // Toasts automatically
  }
};
```

### B. Redux Async Thunks
The `createStandardThunk` factory automatically handles errors.
*   If API returns `success: false`, it calls `handleError` (Toasts).
*   It then `rejects` the thunk, allowing `extraReducers` to handle state changes.

### C. Server-Side Routes (The Two-Hop)
1.  `rgApi` (Server-only) throws `EXTERNAL_ERROR`.
2.  `createRpcHandler` catches it.
3.  **Logging:**
    *   If Operational: `console.warn` (Cleaner logs).
    *   If Bug: `console.error` (Full stack).
4.  **Response:** Returns JSON `{ success: false }` (even for 500s).
