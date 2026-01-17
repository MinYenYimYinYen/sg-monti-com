# Project Overview

## Framework

- **Next.js**: v16.1.1
- **React**: v19.2.3
- **Compiler**: React Compiler (Enabled in `next.config.ts`)
- **Language**: TypeScript (Strict Mode enabled, ES2017 target)
- **Router**: App Router (located in `src/app`)

## Styling

- **Tailwind CSS**: v4 (configured via PostCSS)
- **Preprocessor**: SASS/SCSS (`sass` dependency)
- **Global Styles**: `src/style/globals.scss`
- **Architecture Reference**: See `src/style/style.readme.md`.
- **Summary**: The project uses a **Semantic Styling System**.
    - **Theme**: Defined in `globals.scss` using `@theme`. Maps semantic names (`primary`, `surface`) to brand colors.
    - **Components**: Reusable UI atoms (`Button`, `Card`, `Input`) located in `src/style/components/`.
    - **Containers**: Standardized layout wrappers in `src/style/components/Containers.tsx`.

## State Management

- **Library**: Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Store Location**: `src/store/` directory (Root level)
- **Architecture Reference**: See `src/store/store.readme.md`.
- **Summary**: The project uses a **"Thin Slice" Architecture**. Feature slices handle data only. A Global UI Slice (`uiSlice.ts`) handles `loading` and `error` states globally via `addMatcher`. Thunks use the `WithConfig` pattern to control global spinners and toasts.
- **Selectors vs Hooks**: **Do not** bundle Redux Selectors inside custom hooks (e.g., `useAuth`).
    - Hooks should only expose **Actions** (dispatchers).
    - Components must select data directly using `useSelector(authSelect.role)`.
    - This prevents unnecessary re-renders when a hook is used only for dispatching but the data it selects changes.
- **Async UI Feedback**: Use the **Explicit Status Pattern**.
    - Do not rely on `thunk.fulfilled.match(result)` in components.
    - Add specific status fields to the slice (e.g., `passwordResetStatus: 'idle' | 'pending' | 'success' | 'error'`).
    - Update status in `extraReducers`.
    - Reset status via actions (e.g., `resetPasswordResetStatus`) on component unmount.

## Error Handling

- **Reference**: See `src/lib/errors/errors.readme.md`.
- **Summary**: Uses a **Unified Error Class** (`AppError`) and functional handler (`handleError`). Distinguishes between **Operational errors** (safe to show user) and **Non-Operational bugs** (sanitized).

## Data Modeling (Mongoose)

- **Reference**: See `src/lib/mongoose/mongo.readme.md`.
- **Key Rules**:
    - **Type-Driven**: Models must implement a separate TypeScript interface.
    - **No IDs**: Use Natural Keys (e.g., `userName`) instead of `_id` in app logic.
    - **String Dates**: All dates must be strings (ISO 8601).

## Development Rules

- **React Compiler**: Code must strictly adhere to the Rules of React.
    - **No Manual Memoization**: Do not use `useCallback` or `useMemo` unless specifically needed for referential equality in external libraries. The compiler handles this.
    - **Strict Compliance**: The compiler assumes your code follows the Rules of React (e.g., no mutation during render, consistent hook order). Violations can cause the compiler to de-opt or break the app.
    - **Dependency Arrays**: Always include all dependencies in `useEffect`. The compiler relies on this correctness to optimize re-renders.
    - `eslint-plugin-react-compiler` is configured to "error" on violations.
- **Type Safety**: `tsconfig.json` is set to strict mode with `noUnusedLocals`, `noImplicitReturns`.
- **Hydration & Client Checks**:
    - **Do not** use `useEffect` + `setState` to check for the client environment (this causes double renders and lint errors).
    - **Use**: `const isClient = useIsClient()` from `@/lib/hooks/useIsClient`.
    - This uses `useSyncExternalStore` for a safe, compliant, and performant check.

- **Coding Style**:
    - **Function Parameters**: Prefer object-style parameters (destructuring) for functions with more than one
      argument (e.g., `constructor({ a, b }: Params)`). Single arguments can be passed directly.
    - **File Naming**: Use `camelCase` for directories and files (e.g., `src/app/auth/changePassword/page.tsx`), except for Next.js special files (`page.tsx`, `layout.tsx`) and React Components (`Button.tsx`).

## Key Dependencies
- `eslint`: For linting

## API Architecture

- **Reference**: See `src/lib/api/api.readme.md` for detailed instructions.
- **Pattern**: The project uses a Type-Safe RPC pattern with declarative roles.
- **Requirement**: Agents **must** read the API readme before creating or modifying any API routes or client-side API
  calls.
- **Data Sanitization**: API Routes **must never** return raw Mongoose documents.
    - Use `cleanMongoObject(doc)` or `cleanMongoArray(docs)` from `@/lib/mongoose/cleanMongoObj` to strip `_id` and `__v`.
    - Ensure sensitive fields are removed before returning.

## Session Learnings (Key Conventions)
*   **Silent Error Handling**: Use `handleError(e, { silent: true })` to suppress toasts for expected errors.
*   **Admin-Assisted Auth**: Password resets are handled via admin approval, not email.
*   **"Applied" Role**: New users are gated with an "applied" role until approved.
*   **Modal Architecture**: Use `Modal` (Portal + GSAP) and `TabControl` for complex dialogs.
*   **File Structure**: Prefer `camelCase` for route folders (e.g., `changePassword`).
