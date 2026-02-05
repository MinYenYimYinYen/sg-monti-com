# Project Overview

## Framework

- **Next.js**: v16.1.1
- **React**: v19.2.3
- **Compiler**: React Compiler (Enabled in `next.config.ts`)
- **Language**: TypeScript (Strict Mode enabled, ES2017 target)
- **Router**: App Router (located in `src/app`)

## Styling

- **Tailwind CSS**: v4 (configured via PostCSS)
- **shadcn/ui**: Component library built on Radix UI
- **CSS Variables**: `src/style/tailwind.css` (Brand colors in OKLCH)
- **Global Styles**: `src/style/globals.scss` (Global layout styles only)
- **Architecture Reference**: See `src/style/style.readme.md`.
- **Summary**: The project uses a **Semantic Styling System** with **Intensity-Based Design**.
    - **Brand Colors**:
        - `primary` (Blue): Buttons, primary actions, tabs
        - `accent` (Green): Backgrounds, surfaces, NavBar, table rows
        - `secondary` (Orange): Alternative variant
        - `destructive` (Burnt Orange): Errors, warnings
    - **Intensity Scale**: `ghost` (10%), `soft` (20%), `solid` (100%), `bold` (100% + emphasis)
    - **Default**: Buttons use `variant="primary" intensity="solid"`
    - **Components**: All shadcn components in `src/style/components/` support variant + intensity axes

### Styling Rules

**DO ✓**
- Use semantic colors: `bg-primary`, `bg-accent`, `bg-card`, `text-foreground`
- Use variant + intensity props: `<Button variant="primary" intensity="solid">`
- Use opacity modifiers for tints: `bg-accent/10` (ghost), `bg-primary/20` (soft)
- Let focus rings match variant color automatically
- Use `bg-card` for inputs and popovers instead of `bg-white`

**DON'T ✗**
- Hardcoded colors: `bg-blue-500`, `bg-green-50`, `bg-white`, `text-gray-600`
- Hardcoded focus rings: `focus:ring-blue-500` (use variant's auto ring)
- Custom inline styles for brand colors
- Override semantic colors with className

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
    - If (and only if) tracking status is a requirement, Add specific status fields to the slice (e.g., `passwordResetStatus: 'idle' | 'pending' | 'success' | 'error'`).
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
- **Types**:
  - Prefer types over interfaces, except where interface provides necessary functionality that types cannot handle.

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
- **State Initialization from Props**:
    - **Do not** use `useEffect` to synchronize props to state (triggers ESLint warning `react-hooks/set-state-in-effect` and causes cascading renders).
    - **Pattern**: Initialize state in `useState` with the prop value, then use a `key` prop on the component to reset when data changes.
    - **Example**: `const [selected, setSelected] = useState(item?.value || [])` + `<Component key={item.id} />`.
    - This ensures reactivity without effects and aligns with React Compiler expectations.

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

## RealGreen Customer Module
- **Reference**: See `src/app/realGreen/customer/customer.readme.md`.
- **Streaming**: See `src/app/realGreen/customer/streaming.readme.md`.
- **Summary**: Handles complex data fetching (Customers → Programs -> Services) using a streaming pipeline and "Search Schemes".

## Session Learnings (Key Conventions)
*   **Silent Error Handling**: Use `handleError(e, { silent: true })` to suppress toasts for expected errors.
*   **Admin-Assisted Auth**: Password resets are handled via admin approval, not email.
*   **"Applied" Role**: New users are gated with an "applied" role until approved.
*   **Modal Architecture**: Use `Modal` (Portal + GSAP) and `TabControl` for complex dialogs.
*   **File Structure**: Prefer `camelCase` for route folders (e.g., `changePassword`).
*   **Styling Workflow**: Use semantic colors (`bg-primary`, `bg-accent`, `text-foreground`) with variant + intensity props. Never use hardcoded colors (`bg-blue-500`). See styling rules above.
