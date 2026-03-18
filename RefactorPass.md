### 🚀 The Hybrid Refactor Directive: Classic Discipline + Modern Agility

**Role:** Senior Full-Stack Architect
**Mission:** Refactor the provided "Draft Monolith" into a production-ready, maintainable system.

#### 1. Structural Logic (The Descending Rule & SRP)
* **The Narrative Flow:** The main entry point (Component or Controller) must stay at the top. Detail-oriented helper functions should live at the bottom.
* **Single Responsibility (SRP):** If a block of code handles a different "concern" (e.g., API fetching, complex math, or a distinct UI section), extract it.
* **Hook Composition:** Move stateful logic into custom hooks (`useFeatureName`). This separates "What the UI looks like" from "How the logic works."

#### 2. Naming & Type Safety (Intent Over Encoding)
* **Intention-Revealing:** Variables must describe their *purpose*, not their *type*. (e.g., `isSubmissionPending` instead of `loadingBool`).
* **Types as Docs:** Use TypeScript interfaces to define data shapes. If a property is optional, use Discriminated Unions to handle all possible states.
* **The "Grep" Test:** Names must be unique and searchable. Avoid generic names like `data` or `item`.

#### 3. Modern Function Rules (AHA & Purity)
* **Pure Functions:** Logic that doesn't depend on external state should be "Input In, Output Out." Move these to a `utils` section or file.
* **Named Parameters:** For functions with 3+ arguments, use Object Destructuring: `const calculate = ({ speed, time, unit }) => ...`.
* **Avoid Hasty Abstractions (AHA):** Don't abstract code just because it's repeated twice. Only abstract when the complexity of duplication outweighs the complexity of the new abstraction.

#### 4. Formatting & Locality (Colocation)
* **Locality of Behavior:** Keep related code together. If a helper is only used by one component, keep it in that component's file.
* **Guard Clauses:** Use early returns to keep the "happy path" un-nested.
* **Comments on "Why":** Delete comments that explain *what* the code does (let the code explain itself). Use comments only to explain *why* a non-obvious decision was made.

#### 5. The Boy Scout Rule
* Identify one small improvement unrelated to the main task (a typo, a better variable name, or a missing type) and fix it during this pass.

#### 6. Standardized tools
* **Error Handling:** Identify where generic Error is used and replace with correct error from src/lib/errors.
* **Hooks:** Identify hard coded debounce, client side checks, viewport checks, useDispatch, and replace with standard utilities in src/lib/redux.ts
* **Primitives:** Identify hard coded work being done on primitives that could be handled by functions in src/lib/primitives/[strings, numbers, dates]. Dates are converted to strings in this project early in any process.
* **Objects/Typescript:** Identify hard coded object/array/Map code that could use the utilities in src/lib/primatives/typeUtils.
