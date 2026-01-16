# Authentication Architecture

This project implements a robust, secure, and scalable authentication system using **Next.js App Router**, **Redux Toolkit**, and **JWTs** stored in **HttpOnly Cookies**.

## 1. High-Level Overview

The system follows a **"Defense in Depth"** strategy:
1.  **Edge Layer (`proxy.ts`)**: Acts as the first line of defense. It performs an "Optimistic Check" on the Access Token and redirects unauthenticated users before they hit the application.
2.  **Client Layer (`useAuth`, `AuthGuard`)**: Manages UI state (Redux) and handles 401 automatic refreshes transparently.
3.  **Server Layer (`route.ts`, `assertRole`)**: The "Authoritative Check". Verifies tokens, checks database roles, and manages the Refresh Token rotation.

## 2. Key Components

### A. State Management (Client)
*   **Slice**: `src/app/auth/authSlice.ts`
    *   Manages `user`, `isAuthenticated`, and `registrationEligibility`.
    *   Uses `customCondition` to prevent duplicate requests.
*   **Hook**: `src/app/auth/_hooks/useAuth.ts`
    *   Exposes actions: `login`, `logout`, `register`, `checkEligibility`.
    *   **Rule**: Does NOT expose selectors (components must select data directly).

### B. API & Security (Server)
*   **Route Handler**: `src/app/auth/api/route.ts`
    *   Implements the RPC pattern defined in `AuthContract.ts`.
    *   Handles `login`, `register`, `logout`, `refresh`, `checkEligibility`.
*   **Tokens**:
    *   **Access Token**: Short-lived (15m). Used for API access.
    *   **Refresh Token**: Long-lived (7d). Used to get new Access Tokens.
    *   **Storage**: `HttpOnly`, `Secure`, `SameSite` Cookies.
*   **Role Assertion**: `src/app/auth/_lib/assertRole.ts`
    *   Used in Server Actions/API Routes to enforce permissions.
    *   Checks `x-user-role` header (from Proxy) or falls back to verifying the cookie.

### C. The Proxy (Edge Middleware)
*   **File**: `src/proxy.ts` (exported via `src/middleware.ts` if needed, or auto-detected in Next.js 16).
*   **Function**:
    *   Protects private routes (redirects to `/auth/login`).
    *   Redirects authenticated users away from public routes (e.g., Login -> Home).
    *   Injects `x-user-id` and `x-user-role` headers for downstream Server Components.

### D. Automatic Refresh (Client Interceptor)
*   **File**: `src/lib/api/api.ts`
*   **Logic**:
    *   Intercepts `401 Unauthorized` responses.
    *   Uses a **Mutex** to prevent multiple parallel refresh requests.
    *   Calls `/auth/api` (op: `refresh`) to get new cookies.
    *   Retries the original request automatically.

## 3. Workflows

### Login
1.  User submits form (`LoginPage`).
2.  `useAuth.login` dispatches thunk.
3.  API verifies credentials -> Sets Cookies -> Returns User.
4.  Redux updates `isAuthenticated: true`.
5.  `LoginPage` detects state change -> Redirects to Dashboard.

### Registration (2-Step)
1.  **Step 1**: User enters SA ID & Email.
    *   `checkEligibility` checks if ID exists and is not taken.
2.  **Step 2**: User enters Profile & Password.
    *   `register` creates user -> Sets Cookies -> Returns User.

### Logout
1.  `useAuth.logout` dispatches thunk.
2.  API clears Cookies.
3.  Redux resets state.
4.  `NavBar` updates to show "Login" button.

## 4. Usage Guide

### Protecting a Client Page
Wrap the content (or layout) with `AuthGuard`:
```tsx
import AuthGuard from "@/app/auth/_components/AuthGuard";

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
```

### Protecting a Server Route/Action
Use `assertRole` at the top of your handler:
```typescript
import { assertRole } from "@/app/auth/_lib/assertRole";

export async function GET() {
  await assertRole(["admin", "manager"]); // Throws 403 if failed
  // ... business logic
}
```

### Accessing User Data (Client)
```tsx
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";

const user = useSelector(authSelect.user);
```
