# Agent Workflow: Selector-Driven UI Development (SDUD)

A structured three-phase process for building data-driven features where the selector layer
and its visual verification are developed together, one unit at a time.
Reference this document by name in future conversations to invoke the workflow.

---

## When to use this workflow

Use SDUD when the feature is primarily a **data pipeline** — a chain of selectors that transform
raw Redux state into something the UI consumes. The key insight is that each selector answers
exactly one question, and that question can be verified visually before moving to the next.

This workflow is distinct from the general `AgentWorkflow.md` (Split-Track) in that:
- All implementation tasks are **AI-owned** (no Y-tasks)
- The unit of work is a **selector + dev panel**, not a component
- The human's role is **data reviewer**, not implementer
- Progress is verified by looking at real data, not by reading code

---

## Phase 1 — Plan

**Goal**: Shared understanding of the data pipeline before any code is written.

**Output**: `docs/{feature}Plan.md` in the feature directory.

**Format**: Organized as a **"Story"** — a sequence of questions the selectors will answer,
each building on the last. Cover:

- **The Story**: ordered list of selectors, each described as a single question it answers
- **Data sources**: which existing selectors, Redux slices, or API routes feed the pipeline
- **Design principles**: price-only vs CSP, thin selectors, no monoliths, etc.
- **Type decisions**: what new types are needed, what existing types are reused
- **Open questions / decisions to make**

**Tone**: Conversational. The AI reads existing code before proposing anything. Decisions are
made through back-and-forth. The Story is the deliverable — if it reads clearly, the
implementation will follow naturally.

**The Story format**:
```
Layer 1 — selectFoo → Map<id, string>
"What is each X's Y?"
= derivation logic in plain English

Layer 2 — selectBar → Map<id, number>
"How much Z does each X have?"
= derivation logic in plain English
...
```

---

## Phase 2 — Build

**Goal**: Implement the pipeline one selector at a time, with a dev panel after each step.

**Output**: `docs/{feature}Implementation.md` in the feature directory.

**Roles**: All implementation tasks are AI-owned. The human reviews data in the dev UI and
signals approval before the next selector is built.

**The dev page**: A tabbed page at a route like `/bizPlan/{feature}` is created at the start
(A1). Each new selector gets a new tab. The page is the running record of what's been built.

**Sequencing rule**: One selector at a time. The AI builds the selector, wires it to a dev
panel, and waits for the human to verify the data looks correct before proceeding.

**Handoff protocol**:
1. AI produces a sequenced task list in `docs/{feature}Implementation.md`
2. Tasks are numbered `A1, A2...` — all AI-owned
3. Each task = one selector + one dev panel (or a small cluster of related selectors)
4. AI builds the task, signals completion with a brief description of what to look for
5. Human navigates to the dev page, reviews the data, and signals: "Looks good, proceed" or
   describes what's wrong
6. AI adjusts if needed, then proceeds to the next task
7. Repeat until the pipeline is complete

**Task format**:
```
### A1: deps hook + page scaffold
### A2: selectFoo + FooPanel
  Selector: Map<employeeId, string> — "When is each employee next available?"
  Panel: table — Employee | Next Available Date | Source
### A3: selectBar + BarPanel
  ...
```

**Design principles enforced during build**:
- **Thin selectors** — each selector is one unit of data; no monoliths
- **Single source of truth** — downstream selectors read from upstream selectors, never re-derive
- **No manual memoization** — React Compiler handles this; no `useCallback`/`useMemo`
- **Inline helpers** — don't import from other modules' internals; re-implement if needed
- **Price only** (or whatever dimension is agreed in Phase 1) — no premature generalization

---

### Implementation Doc Content Standard

The implementation doc is a **task brief and running log**, not a transcript of the code.

**For each selector task, capture:**
- The selector name, return type, and the single question it answers
- Input selectors (what it reads from)
- Key logic — the non-obvious derivation, not the boilerplate
- Fallback behavior (what happens when data is missing)
- Dev panel description: what columns/rows to show, how to sort, what to highlight

**What to omit:**
- Full selector implementation (the source file is the source of truth)
- Exhaustive import lists
- Boilerplate that follows obvious project patterns

**Status tracking**: A status table at the bottom of the doc tracks each task with ✅/☐.
Update it as tasks complete. Add a "Session Notes" section when pausing mid-feature to
document what was built, what changed from the plan, and what remains.

---

## Phase 3 — Polish

**Goal**: Leave no messes. Would Robert C. Martin approve?

**Checklist**:
- [ ] Remove debug `console.log` calls from dev panels
- [ ] Remove unused code (dead imports, orphaned files, old stubs)
- [ ] Check for duplicated logic — consolidate if found
- [ ] Verify naming consistency across types, selectors, and panels
- [ ] Resolve any leftover `TODO` comments
- [ ] Update plan and implementation docs to reflect on-the-fly deviations
- [ ] Confirm all new files follow project conventions (camelCase dirs, component PascalCase)
- [ ] Decide: promote dev panels to production UI, or remove them

---

## Document Naming Convention

Same as `AgentWorkflow.md`:

```
{featureDir}/docs/{feature}Plan.md
{featureDir}/docs/{feature}Implementation.md
```

For extensions:
```
{featureDir}/docs/{feature}_01_{subFeature}Plan.md
{featureDir}/docs/{feature}_01_{subFeature}Implementation.md
```

---

## Invoking the Workflow

In a future conversation, say:
- **"Let's do Phase 1 (SDUD) on {feature}"** — start a Story planning conversation
- **"Let's do Phase 2 (SDUD) on {feature}"** — produce the selector task list
- **"Let's do Phase 3 (SDUD) on {feature}"** — run the Polish pass
- **"Looks good, proceed"** — mid-build approval signal
- **"Something looks wrong with A3"** — mid-build correction signal

Attach the relevant `docs/` file(s) when invoking a phase so the AI has full context.
