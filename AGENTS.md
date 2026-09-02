# Project Overview

## Framework:

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
- **API Integration**: API Routes use `createRpcHandler` to catch errors and return structured JSON (even for 500s). The client `api()` wrapper returns these errors as data (`{ success: false }`) instead of throwing, allowing Redux Thunks to handle them gracefully.

## Data Modeling (Mongoose)

- **Reference**: See `src/lib/mongoose/mongo.readme.md`.
- **Key Rules**:
    - **Type-Driven**: Models must implement a separate TypeScript interface.
    - **No IDs**: Use Natural Keys (e.g., `userName`) instead of `_id` in app logic.
    - **String Dates**: All dates must be strings (ISO 8601).
- **Types**:
  - Prefer types over interfaces, except where interface provides necessary functionality that types cannot handle.

### Model Instance Creation

- **Pattern**: Use `createModel()` helper from `@/lib/mongoose/createModel` to prevent Next.js hot-reload issues.
- **Issue**: Calling `mongoose.model()` directly multiple times (during hot-reload) throws `OverwriteModelError`.
- **Solution**: `createModel(modelName, schema)` checks if model exists before creating it.
- **Example**:
```typescript
const SchedPromiseSchema = new mongoose.Schema<SchedPromise>({...});
const SchedPromiseModel = createModel("SchedPromise", SchedPromiseSchema);
export default SchedPromiseModel;
```

## Data Module Pattern

Use this pattern when creating a new data-driven feature that requires:
- Backend API endpoint
- Redux state management
- Selector transformations
- React hook for auto-fetching

### Architecture (5 Components)

1. **Contract** (`*Contract.ts`)
   - TypeScript interface extending `ApiContract`
   - Defines request params and response types
   - Example: `SchedPromiseContract.ts`

2. **Route** (`api/route.ts`)
   - API handler using `createRpcHandler`
   - MongoDB queries, data sanitization
   - Example: `src/app/schedPromise/api/route.ts`

3. **Slice** (`*Slice.ts`)
   - Redux slice using `createStandardThunk`
   - Feature-specific state only (no UI state)
   - Implements deduplication via `transformParams`
   - Example: `schedPromiseSlice.ts`

4. **Selectors** (`*Select.ts`)
   - Reselect selectors for derived state
   - Transforms storage format to consumption format
   - Creates maps for efficient lookups
   - Example: `schedPromiseSelect.ts`

5. **Hook** (`use*.ts`)
   - React hook for auto-fetching data
   - Dispatches thunk based on dependencies
   - Example: `useSchedPromise.ts`

### Type Naming Conventions

Types follow a layered suffix pattern that signals their role in the data pipeline:

| Suffix | Meaning | Example |
|---|---|---|
| `Doc` | Storage shape — keys and metadata only, no hydrated data | `EquipmentDoc`, `EquipmentPackageDoc` |
| `Props` | Hydration additions — data resolved from other sources | `EquipmentProps`, `EquipmentPackageProps` |
| *(none)* | Final consumable entity — `Doc & Props`, ready for UI | `Equipment`, `EquipmentPackage` |
| `DocProps` | Used when extending RealGreen entities with native keys/metadata | `CallAheadDocProps` |

**Rules:**
- Native data modules start at the `Doc` level (no `Raw` or `Core` needed).
- RealGreen entities may have a `Raw` → `Core` → `DocProps` → `Doc` chain because they integrate external API shapes with native storage.
- The no-suffix type is the one components and selectors consume. Never pass a `Doc` directly to UI.

### Key Conventions

- **Auto-Deduplication**: `uiSlice.ts` automatically prevents duplicate API calls via param hashing. The slice's `transformParams` filters out already-loaded data before hashing.
- **Storage vs Consumption**: Use storage-optimized types (e.g., discriminated unions) in state, transform to conventional types in selectors.
- **Loading/Error States**: Handled globally by `uiSlice.ts` via `addMatcher`. Feature slices only track data.
- **File Naming**: Follow pattern: `featureContract.ts`, `featureSlice.ts`, `featureSelect.ts`, `useFeature.ts`
- **Full Hydration in Selectors**: FK references on `Doc` types are always resolved to full entities in selectors. The UI layer receives fully hydrated no-suffix types — never raw FKs. Components access data directly, no lookups. Example: `SubProductConfigDoc.mixedByEquipmentId: string | null` → `SubProductConfig.mixedByEquipment: Equipment | null` (resolved in `productSelectors.ts`).

### Example: SchedPromise Module

```typescript
// 1. Contract
export interface SchedPromiseContract extends ApiContract {
  getSchedPromises: {
    params: { serviceIds?: number[]; programIds?: number[]; customerIds?: number[]; };
    result: DataResponse<SchedPromise[]>;
  };
}

// 2. Route (simplified)
const handlers: SchedPromiseContract = {
  getSchedPromises: async ({ params }) => {
    const docs = await SchedPromiseModel.find({ $or: queries }).lean();
    return { success: true, payload: cleanMongoArray(docs) };
  }
};

// 3. Slice
export const { getSchedPromises } = createStandardThunk<SchedPromiseContract>({
  contractName: "schedPromise",
  transformParams: (params, { getState }) => {
    const existingPromises = schedPromiseSelect.schedPromises(getState());
    // Filter out already-loaded IDs, return only arrays with values
    return transformed;
  }
});

// 4. Selectors
const selectCustPromiseMap = createSelector(
  [selectCustPromises],
  (custPromises) => new Grouper(custPromises).toUniqueMap(c => c.custId)
);

// 5. Hook
export function useSchedPromise() {
  const dispatch = useAppDispatch();
  const serviceDocs = useSelector(centralSelect.serviceDocs);

  useEffect(() => {
    dispatch(getSchedPromises({
      params: { serviceIds: serviceDocs.map(s => s.servId) },
      config: { loadingMsg: "Fetching Schedule Promises" }
    }));
  }, [dispatch, serviceDocs]);
}
```

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
    - **Comments**: Comments describe *why*, not *what*. Only add a comment when there is genuine potential for confusion. Type-level JSDoc on the type itself is appropriate when the type's purpose is non-obvious; per-property comments are noise unless a property has a non-obvious constraint or invariant.
    - **Inline function variable names**: In one-liner callbacks, abbreviation is acceptable (`customers.map(c => c.id)`). When a callback uses a block body (`{}`), use full descriptive names — `customers.map((customer) => { ... })`, not `customers.map((c) => { ... })`.
    - **Naming — describe the data, not the structure**: Property and variable names must describe what the data *is*, not its structural role in a container. Generic placeholder words like `entry`, `item`, `record`, `element`, or `node` are not acceptable as property names or standalone type names. If Dr. Bob wouldn't know what it holds from the name alone, rename it.
      - **DON'T ✗**: `entries: AssignmentPlanEntry[]`, `items: MenuItem[]`, `records: LogRecord[]`
      - **DO ✓**: `groupAssignments: GroupAssignment[]`, `menuItems: MenuItem[]`, `logs: Log[]`
      - Type names may use structural suffixes (`Doc`, `Props`, etc.) per the type naming conventions above — but the *property* holding a collection of those types must name the collection semantically, not generically.

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
- **Universal Handler**: All API routes must use `createRpcHandler(handlers)` to ensure consistent logging, auth, and error formatting.

## Tab-Routed Page Layout Pattern

Use this pattern when a feature has multiple views navigated by tabs, implemented as Next.js App Router sub-routes.

### When to Use
- A feature has 2+ distinct views (e.g., "By Employee", "By Date")
- Views share a common header (controls, filters, title)
- Views share a data orchestration hook (`useDeps`)

### File Structure

```
src/app/featureName/
  layout.tsx          ← "use client" — calls useDeps(), renders PageLayout
  page.tsx            ← redirect to first tab, or root tab content
  useDeps.ts          ← orchestrates all data hooks for this feature
  tabA/
    page.tsx          ← tab A content
  tabB/
    page.tsx          ← tab B content
```

### Components

**`PageLayout`** (`src/components/PageLayout/PageLayout.tsx`)
The outer shell. Handles the `flex flex-col h-full overflow-hidden` structure, the sticky header bar, and the scrollable body. Use compound component slots:
- `<PageLayout.Header left={} right={} />` — `shrink-0 bg-card border-b` bar with left/right slots
- `<PageLayout.Body>` — `flex-1 min-h-0 overflow-hidden` body

**`TabNav`** (`src/components/PageLayout/TabNav.tsx`)
Renders a list of `TabNavItem` (`{ label, href, icon? }`) as styled nav links. Handles active-state detection:
- Exact match for the root href (e.g., `/productivity`)
- `pathname.startsWith(href)` for sub-routes

```tsx
const TABS: TabNavItem[] = [
  { label: "Summary", href: "/productivity" },
  { label: "By Date", href: "/productivity/byDate", icon: CalendarDays },
] as const;

<TabNav items={TABS} rootHref="/productivity" />
```

### Layout Template

```tsx
"use client";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav } from "@/components/PageLayout/TabNav";
import { useFeatureDeps } from "./useFeatureDeps";

const TABS = [
  { label: "Tab A", href: "/featureName" },
  { label: "Tab B", href: "/featureName/tabB" },
] as const;

export default function FeatureLayout({ children }: { children: React.ReactNode }) {
  useFeatureDeps();
  return (
    <PageLayout>
      <PageLayout.Header
        left={/* feature-specific controls */}
        right={<TabNav items={TABS} rootHref="/featureName" />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
```

### Key Rules
- **`layout.tsx` is the only place `useDeps()` is called** — sub-route pages never call it again.
- **Sub-route `page.tsx` files are thin** — they render one panel component and nothing else.
- **`useDeps.ts` is always feature-specific** — it is not shared between features.
- **The root `page.tsx`** either redirects to the first tab (`redirect("/featureName/tabA")`) or renders the root tab content directly.
- **`PageLayout.Header` slots are optional** — omit `left` or `right` if not needed.

### Examples
- `src/app/bizPlan/paceCrawler/layout.tsx` — header with date picker + icon-based `TabNav`
- `src/app/bizPlan/customerValue/layout.tsx` — header with filter panel + `Button asChild` nav (pre-dates this pattern; new pages use `TabNav`)

---

## RealGreen Customer Module
- **Reference**: See `src/app/realGreen/customer/customer.readme.md`.
- **Streaming**: See `src/app/realGreen/customer/streaming.readme.md`.
- **Summary**: Handles complex data fetching (Customers → Programs -> Services) using a streaming pipeline and "Search Schemes".

## Session Learnings (Key Conventions)
* **Tool Result Loop Detection**: If a tool call returns the same result as the immediately preceding call of the same tool on the same path (especially `read_file` returning identical file content repeatedly), the session is in a broken state where tool results are being replayed. **Stop all tool calls immediately.**
    - **In Plan Mode**: Use `plan_mode_respond` to acknowledge the loop to the user and wait for them to interrupt and restart the task.
    - **In Act Mode**: Use `attempt_completion` to report: (1) that a tool result loop was detected, (2) which tool/path is looping, and (3) which files were successfully read before the loop started — so the user can provide that context on restart without re-reading from disk.
    - **Never** retry the same or a different tool call after detecting a loop. Results will continue to be replayed regardless of what you call, and continuing wastes context and risks decisions based on stale data.
* **Silent Error Handling**: Use `handleError(e, { silent: true })` to suppress toasts for expected errors.
* **Admin-Assisted Auth**: Password resets are handled via admin approval, not email.
* **"Applied" Role**: New users are gated with an "applied" role until approved.
* **Modal Architecture**: Use `Modal` (Portal + GSAP) and `TabControl` for complex dialogs.
* **File Structure**: Prefer `camelCase` for route folders (e.g., `changePassword`).
* **Styling Workflow**: Use semantic colors (`bg-primary`, `bg-accent`, `text-foreground`) with variant + intensity props. Never use hardcoded colors (`bg-blue-500`). See styling rules above.
* **tsc**: Do not do tsc checks on markdown files.
* **Type Checking**: After editing files, use `ide_diagnostics` on the modified files for fast feedback — it reads from the IDE's live language server and is much faster than a full compile. Run `tsc --noEmit` only when making type-level changes (modifying shared types, function signatures, or removing exports) that could affect files not directly edited.
* **Task Completion**: Do not start or launch the development server after completing a task. Do not use `start`, `open`, or `npm run dev` commands as part of `attempt_completion`. Simply report what was done.

# For markdown files on Windows, write with UTF-8 BOM encoding
(echo -ne '\xEF\xBB\xBF'; cat <<'EOF'
[content here]
EOF
) > "path/to/file.md"

**Project Architecture & Context Boundaries** This project strictly separates concerns. When planning or executing tasks, deduce the required context based on the layers involved. DO NOT read files outside the immediate scope of the target layer. Rely on the WebStorm IDE Index MCP server to peek at TypeScript interfaces instead of opening full files. Use tools like `ide_find_class` or `ide_find_references` to gather precise structural data without reading hundreds of lines of irrelevant code.

|**Layer**|**Responsibility**|**Permitted Context Bounds**|
|---|---|---|
|**Components**|Display data and manage local UI state.|Target component, immediate Hooks used, local UI types.|
|**Selectors**|Read and compute derived data from state.|Target selector, Slice state interfaces (via MCP index only).|
|**Hooks**|Dispatch thunk calls and orchestrate actions.|Target hook, Thunk function signatures (via MCP index only).|
|**Slices**|Define the shape of the state data.|Target slice, related state types.|
|**Thunks**|Call API methods and request data.|Target thunk, API function signatures (via MCP index only).|
|**API**|Fetch raw data from external endpoints.|Target API file, DTO (Data Transfer Object) types.|

**Execution Rule:** You MUST exhaust your efforts using the MCP server to gather the required context. If you cannot find the necessary information, you MUST stop and ask me if you should proceed with a generic file search.