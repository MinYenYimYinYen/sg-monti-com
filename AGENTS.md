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

## State Management

- **Library**: Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Store Location**: `src/store/` directory (Root level)
- **Architecture Reference**: See `src/store/store.readme.md`.
- **Summary**: The project uses a **"Thin Slice" Architecture**. Feature slices handle data only. A Global UI Slice (`uiSlice.ts`) handles `loading` and `error` states globally via `addMatcher`. Thunks use the `WithUI` pattern to control global spinners and toasts.

## Error Handling

- **Reference**: See `src/lib/errors/errors.readme.md`.
- **Summary**: Uses a **Unified Error Class** (`AppError`) and functional handler (`handleError`). Distinguishes between **Operational errors** (safe to show user) and **Non-Operational bugs** (sanitized).

## Development Rules

- **React Compiler**: Code must strictly adhere to the Rules of React.
    - No mutation of variables during render.
    - No conditional hook calls.
    - `eslint-plugin-react-compiler` is configured to "error" on violations.
- **Type Safety**: `tsconfig.json` is set to strict mode with `noUnusedLocals`, `noImplicitReturns`.

- **Coding Style**:
    - **Function Parameters**: Prefer object-style parameters (destructuring) for functions with more than one
      argument (e.g., `constructor({ a, b }: Params)`). Single arguments can be passed directly.

## Key Dependencies
- `eslint`: For linting

## API Architecture

- **Reference**: See `src/lib/api/api.readme.md` for detailed instructions.
- **Pattern**: The project uses a Type-Safe RPC pattern with declarative roles.
- **Requirement**: Agents **must** read the API readme before creating or modifying any API routes or client-side API
  calls.
