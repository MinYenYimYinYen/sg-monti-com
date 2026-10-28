# Project Overview

## Framework

- **Next.js**: v16.1.1
- **React**: v19.2.3
- **Compiler**: React Compiler (Enabled in `next.config.ts`)
- **Language**: TypeScript (Strict Mode enabled, ES2017 target)
- **Router**: App Router (located in `src/app`)

## Skills

Task-specific procedures live in `.claude/skills/` and load on demand. Use the matching skill. If skills are unavailable in your tool, read the fallback files instead.

| Task | Skill | Fallback reading |
|---|---|---|
| Add or change an entity, API operation, slice, selector or fetch hook | `data-module` | `src/store/store.readme.md`, `src/lib/api/api.readme.md`, `src/lib/mongoose/mongo.readme.md` |
| Add or change an API route, client API call, or error handling | `api-route` | `src/lib/api/api.readme.md`, `src/lib/errors/errors.readme.md` |
| Add or change a tab-routed page or layout | `tab-routed-page` | `src/components/PageLayout/`, `src/app/pace/layout.tsx` |
| Build or restyle UI, add a variant component, fix scrolling | `ui-styling` | `src/style/style.readme.md` |
| Create or modify a PDF document | `pdf-document` | `src/lib/pdf/pdf.readme.md` |
| Form templates (positioned slots on preprinted forms), form data type registry, slot options, batch form printing | `form-template` | `src/app/formTemplate/formDataContract.ts`, `src/app/prepayLetters/PrepayLetterTypes.tsx` |
| Write or modify tests | `write-tests` | `src/__tests__/testing.readme.md` |
| RealGreen Customer / Program / Service pipeline, search schemes, PIPELINE flag | `realgreen-customer` | `src/app/realGreen/realGreen.readme.md`, `src/app/realGreen/customer/customer.readme.md` |
| RealGreen Product module (Master / Sub / Single) | `product-module` | `src/app/realGreen/product/_lib/product.readme.md` |
| RealGreen CallLog module and its sync | `call-log` | `src/app/realGreen/callLog/callLog.readme.md` |
| Read live data from MongoDB (inspect, count, report on actual documents; read-only, bounded) | `mongo-read` | `.claude/skills/mongo-read/SKILL.md` |
| Price Increase module (settings, season plans, results pipeline, flag write-back) | — | `src/app/priceIncrease/priceIncrease.readme.md` (read only the Required Reading for the relevant section) |

## Styling

- **Stack**: Tailwind CSS v4 (PostCSS), shadcn/ui on Radix. Variables in `src/style/tailwind.css` (OKLCH), global layout styles only in `src/style/globals.scss`. Reference: `src/style/style.readme.md`.
- **Semantic system**: `primary` (blue, actions), `accent` (green, surfaces), `secondary` (orange), `destructive` (burnt orange). Intensity scale: `ghost` (10%), `soft` (20%), `solid` (100%, default), `bold`. Buttons default to `variant="primary" intensity="solid"`.
- **DO**: semantic colors (`bg-primary`, `bg-accent`, `bg-card`, `text-foreground`), `variant` + `intensity` props, opacity modifiers for tints (`bg-accent/10`), `bg-card` for inputs and popovers.
- **DON'T**: hardcoded colors (`bg-blue-500`, `bg-white`, `text-gray-600`), hardcoded focus rings, inline styles for brand colors, overriding semantic colors with `className`.

## State Management

- **Library**: Redux Toolkit. Store in `src/store/`. Reference: `src/store/store.readme.md`.
- **"Thin Slice" architecture**: feature slices hold data only. `uiSlice.ts` handles `loading`/`error` globally via `addMatcher`. Thunks use the `WithConfig` pattern to control spinners, toasts, caching and forced refresh.
- **Selectors vs Hooks**: do **not** bundle selectors inside custom hooks (e.g. `useAuth`). Hooks expose **actions** only. Components select data directly with `useSelector(authSelect.role)`. This avoids re-renders when a hook is used only for dispatching.
- **Async UI feedback (Explicit Status Pattern)**: never rely on `thunk.fulfilled.match(result)` in components. Only if tracking status is a requirement, add a status field to the slice (e.g. `passwordResetStatus: 'idle' | 'pending' | 'success' | 'error'`), update it in `extraReducers`, and reset it via an action on unmount.

## Error Handling

- Reference: `src/lib/errors/errors.readme.md`. One `AppError` class plus `handleError`. **Operational** errors are safe to show the user; **non-operational** bugs are sanitized.
- API routes use `createRpcHandler`, which returns structured JSON even for 500s. The client `api()` wrapper returns operational failures as data (`{ success: false }`) instead of throwing, so thunks can handle them.
- Use `handleError(e, { silent: true })` to suppress toasts for expected errors.

## Data Modeling (Mongoose)

- Reference: `src/lib/mongoose/mongo.readme.md`.
- **Type-driven**: every model implements a separate TypeScript type, kept in a different file from the model.
- **No IDs**: use natural keys (e.g. `userName`) instead of `_id` in app logic.
- **String dates**: all dates are strings (ISO 8601).
- **Types over interfaces**, except where an interface provides necessary functionality that types cannot.
- **Always create models with `createModel(name, schema)`** from `@/lib/mongoose/createModel`, never `mongoose.model()` directly, to avoid `OverwriteModelError` on hot reload.

### Type Naming Conventions

Types follow a layered suffix pattern that signals their role in the data pipeline:

| Suffix | Meaning | Example |
|---|---|---|
| `Doc` | Storage shape: keys and metadata only, no hydrated data | `EquipmentDoc`, `EquipmentPackageDoc` |
| `Props` | Hydration additions: data resolved from other sources | `EquipmentProps`, `EquipmentPackageProps` |
| *(none)* | Final consumable entity: `Doc & Props`, ready for UI | `Equipment`, `EquipmentPackage` |
| `DocProps` | Used when extending RealGreen entities with native keys/metadata | `CallAheadDocProps` |

- Native data modules start at the `Doc` level (no `Raw` or `Core` needed).
- RealGreen entities may have a `Raw` -> `Core` -> `DocProps` -> `Doc` chain because they integrate external API shapes with native storage.
- The no-suffix type is the one components and selectors consume. Never pass a `Doc` directly to UI.
- FK references on `Doc` types are always resolved to full entities in selectors. The UI receives fully hydrated no-suffix types, never raw FKs.

## Data Modules and API

- **Data module** (contract, route, slice, selectors, hook): use the `data-module` skill. File naming: `featureContract.ts`, `featureSlice.ts`, `featureSelect.ts`, `useFeature.ts`.
- **Auto-deduplication**: `uiSlice.ts` prevents duplicate API calls by param hashing. A slice's `transformParams` filters out already-loaded data before hashing.
- **API pattern**: Type-Safe RPC with declarative roles. Agents **must** read `src/lib/api/api.readme.md` before creating or modifying any API route or client API call (the `api-route` skill covers this).
- **Data sanitization**: API routes **never** return raw Mongoose documents. Use `cleanMongoObject(doc)` / `cleanMongoArray(docs)` from `@/lib/mongoose/cleanMongoObj`, and remove sensitive fields.
- **Universal handler**: every API route uses `createRpcHandler(handlers)` (RealGreen routes use `createRealGreenRpcHandler`).

## Development Rules

- **React Compiler**: code must strictly follow the Rules of React. `eslint-plugin-react-compiler` is set to "error".
    - **No manual memoization**: do not use `useCallback` or `useMemo` unless needed for referential equality in external libraries.
    - **Dependency arrays**: always include all dependencies in `useEffect`.
    - No mutation during render, consistent hook order.
- **Type safety**: `tsconfig.json` is strict with `noUnusedLocals` and `noImplicitReturns`.
- **Hydration and client checks**: do **not** use `useEffect` + `setState` to detect the client. Use `const isClient = useIsClient()` from `@/lib/hooks/useIsClient`.
- **State initialization from props**: do **not** use `useEffect` to sync props to state. Initialize `useState` from the prop and put a `key` on the component to reset it, e.g. `const [selected, setSelected] = useState(item?.value || [])` + `<Component key={item.id} />`.
- **Prop functions and prop drilling**:
    - **`Action` suffix required**: any function passed as a prop must end in `Action` (`onCloseAction`, `onSaveAction`). This satisfies the Next.js serialization linter (TS71007) and marks it as a callback, not a Server Action.
    - **Prefer Redux + IDs over callbacks**: before passing a callback down the tree, ask whether the child can dispatch directly. Pass an `id`, let the child read data with `useSelector`, and let it call the matching `use<Entity>` hook (e.g. `useRouteNotes`, `usePaceAssignmentGroup`) or `useAppDispatch()` if no hook exists.
    - **Keep callback props when** the action mutates ephemeral local interaction state (drag refs, animation state) that must not survive navigation, or the component is a generic reusable primitive (`RouteNoteEditor`, `DragHandle`, `SlotEditor`) decoupled from any Redux slice.
    - **Duplicate API call risk**: when a child gains the ability to dispatch a thunk, check that the thunk has deduplication (`customCondition`, `transformParams`, or range-based guards). If it does not, flag the risk and ask how to proceed before implementing.
- **Coding style**:
    - **Function parameters**: use an object parameter (destructuring) for functions with more than one argument (`constructor({ a, b }: Params)`). Single arguments are passed directly.
    - **File naming**: `camelCase` for directories and files (`src/app/auth/changePassword/page.tsx`), except Next.js special files (`page.tsx`, `layout.tsx`) and React components (`Button.tsx`).
    - **Comments**: describe *why*, not *what*. Only comment where there is real potential for confusion. Type-level JSDoc is appropriate when a type's purpose is non-obvious; per-property comments are noise unless a property has a non-obvious constraint or invariant.
    - **Inline callback variable names**: abbreviation is fine in one-liners (`customers.map(c => c.id)`). Block-body callbacks use full names: `customers.map((customer) => { ... })`.
    - **Naming: describe the data, not the structure**: generic words like `entry`, `item`, `record`, `element` or `node` are not acceptable as property names or standalone type names. If Dr. Bob wouldn't know what it holds from the name alone, rename it.
        - **DON'T**: `entries: AssignmentPlanEntry[]`, `items: MenuItem[]`, `records: LogRecord[]`
        - **DO**: `groupAssignments: GroupAssignment[]`, `menuItems: MenuItem[]`, `logs: Log[]`
        - Type names may use the structural suffixes above (`Doc`, `Props`), but the *property* holding a collection must name the collection semantically.

## Pages and Layout

- **Tab-routed pages** (2+ views as sub-routes with a shared header): use the `tab-routed-page` skill. `layout.tsx` is the only place the feature's `useDeps()` hook is called; sub-route `page.tsx` files are thin.
- **Page scroll convention**: the root layout clips overflow (`overflow-hidden`), so every page's outermost element **must** establish a scroll context or content is silently clipped.
    - Simple pages: `<div className="h-full overflow-y-auto"><div className="p-6 ...">...</div></div>`.
    - Pages with a sticky header: `PageLayout` + `PageLayout.Body`. Body provides `flex-1 min-h-0 overflow-hidden`; the content inside still needs `overflow-y-auto h-full`.
    - **Agent rule**: when creating or reviewing page-level UI, check this. If it is violated, flag it and propose the fix before completing the task.
- **Modals**: use `Modal` (Portal + GSAP) and `TabControl` for complex dialogs.

## Feature Areas (read the reference before working in them)

- **PDF**: `@react-pdf/renderer` + `react-pdf-tailwind`. Agents **must** read `src/lib/pdf/pdf.readme.md` before creating or modifying PDF documents. Shared primitives: `src/lib/pdf/tw.ts`, `_components/PDFNumber.tsx`, `_components/pdfIcons.tsx`. Feature PDF documents live beside their feature, not in `src/lib/pdf/`.
- **RealGreen Customer module**: see `src/app/realGreen/customer/customer.readme.md` and `src/app/realGreen/realGreen.readme.md` (Customers -> Programs -> Services, search schemes, mirror vs RealGreen pipeline). Sample data: `src/app/realGreen/sampleData/samples.readme.md`.
- **Testing**: Vitest. Agents **must** read `src/__tests__/testing.readme.md` before writing or modifying tests. Entity construction in tests must use `generateCustomer` from `src/app/realGreen/sampleData/generateCustomer.ts`. Never construct `Service`/`Program`/`Customer` manually.
- **Auth**: password resets are admin-assisted (no email). New users are gated with an "applied" role until approved. See `src/app/auth/auth.readme.md`.

## Session Learnings (Key Conventions)

* **Tool Result Loop Detection**: If a tool call returns the same result as the immediately preceding call of the same tool on the same path (especially `read_file` returning identical file content repeatedly), the session is in a broken state where tool results are being replayed. **Stop all tool calls immediately.**
    - **In Plan Mode**: Use `plan_mode_respond` to acknowledge the loop to the user and wait for them to interrupt and restart the task.
    - **In Act Mode**: Use `attempt_completion` to report: (1) that a tool result loop was detected, (2) which tool/path is looping, and (3) which files were successfully read before the loop started, so the user can provide that context on restart without re-reading from disk.
    - **Never** retry the same or a different tool call after detecting a loop. Results will continue to be replayed regardless of what you call, and continuing wastes context and risks decisions based on stale data.
* **Type Checking**: After editing files, use `ide_diagnostics` on the modified files for fast feedback. It reads from the IDE's live language server and is much faster than a full compile. Run `tsc --noEmit` only when making type-level changes (modifying shared types, function signatures, or removing exports) that could affect files not directly edited. Do not run `tsc` checks on markdown files.
* **Task Completion**: Do not start or launch the development server after completing a task. Do not use `start`, `open`, or `npm run dev` as part of `attempt_completion`. Simply report what was done.

## Windows: writing markdown files

Write markdown files with a UTF-8 BOM. In PowerShell:

```powershell
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($true)))
```

## Project Architecture and Context Boundaries

This project strictly separates concerns. When planning or executing tasks, deduce the required context from the layers involved. Do **not** read files outside the immediate scope of the target layer. Rely on the WebStorm IDE Index MCP server to peek at TypeScript interfaces instead of opening full files. Use tools like `ide_find_class` or `ide_find_references` to gather precise structural data without reading hundreds of lines of irrelevant code.

|**Layer**|**Responsibility**|**Permitted Context Bounds**|
|---|---|---|
|**Components**|Display data and manage local UI state.|Target component, immediate Hooks used, local UI types.|
|**Selectors**|Read and compute derived data from state.|Target selector, Slice state interfaces (via MCP index only).|
|**Hooks**|Dispatch thunk calls and orchestrate actions.|Target hook, Thunk function signatures (via MCP index only).|
|**Slices**|Define the shape of the state data.|Target slice, related state types.|
|**Thunks**|Call API methods and request data.|Target thunk, API function signatures (via MCP index only).|
|**API**|Fetch raw data from external endpoints.|Target API file, DTO (Data Transfer Object) types.|

**Execution Rule:** Use the WebStorm IDE Index MCP server (`ide_*` tools) to gather the required context. If you cannot find the necessary information, stop and ask whether to proceed with a generic file search. If the `ide_*` tools are not available in the current session, say so and ask before falling back to generic search.
