# Agent Workflow: Feature Development Lifecycle (FDL)

A structured three-phase process for building features collaboratively between human and AI.
Reference this document by name in future conversations to invoke the workflow.

---

## Phase 1 — Plan

**Goal**: Shared understanding of what we're building before any code is written.

**Output**: `docs/{feature}Plan.md` in the feature directory.

**Format**: Organized by concern, not sequentially ordered. Cover:
- Desired behaviors and UX
- Data sources (existing selectors, new API routes needed?)
- Component tree
- State management (new slice? new selectors? new actions?)
- Type additions or changes
- Open questions / decisions to make

**Tone**: Conversational. This is a design document, not a spec. Decisions are made here through
back-and-forth with the human. The AI reads existing code before proposing anything.

---

## Phase 2 — Split-Track

**Goal**: Implement the feature with clear ownership boundaries and early UI delivery.

**Output**: `docs/{feature}Implementation.md` in the feature directory.

**Roles**:
- **Human owns**: types, Redux slice state, selectors, backend/API changes
- **AI owns**: all UI components

**Sequencing rule**: UI is implemented as early as possible. Where UI depends on state or selectors
that don't exist yet, those become human tasks first. AI writes UI against the new contracts as soon
as the data layer is ready. Stubs bridge the gap.

**Handoff protocol**:
1. AI produces a sequenced task list in `docs/{feature}Implementation.md`
2. Tasks are numbered `Y1, Y2...` (human) and `A1, A2...` (AI)
3. Each Y-task includes a full code snippet for human review
4. Human completes a Y-task block and signals: "Check my work on Y1"
5. AI reads the file, reviews, flags issues, suggests corrections if needed
6. Once clean, AI proceeds with the unblocked A-tasks
7. Repeat until all tasks are done

**Status table**: Bottom of the implementation doc tracks task ownership, status, and dependencies.

---

## Phase 3 — Polish

**Goal**: Leave no messes. Would Robert C. Martin approve?

**Checklist**:
- [ ] Remove unused code (dead imports, orphaned files, old stubs)
- [ ] Check for duplicated logic — consolidate if found
- [ ] Verify naming consistency across types, selectors, components, and actions
- [ ] Resolve any leftover `TODO` comments
- [ ] Update plan and implementation docs to reflect on-the-fly deviations made during build
      (e.g., a property renamed, a type simplified, a component restructured)
- [ ] Confirm all new files follow project conventions (camelCase dirs, component PascalCase, etc.)

---

## Document Naming Convention

### New feature
```
{featureDir}/docs/{feature}Plan.md
{featureDir}/docs/{feature}Implementation.md
```

### Extension of existing feature
```
{featureDir}/docs/{feature}_01_{subFeature}Plan.md
{featureDir}/docs/{feature}_01_{subFeature}Implementation.md
```

The `01` index increments for each subsequent extension, preserving a history of how the feature
evolved. When attaching files in a future conversation, specify which phase to focus on.

### Example
```
src/app/bizPlan/pace/docs/
  pacePlan.md                          ← original feature plan
  paceImplementation.md                ← original Split-Track checklist
  pace_01_progCodeGroupingPlan.md      ← first extension plan
  pace_01_progCodeGroupingImplementation.md
```

---

## Invoking the Workflow

In a future conversation, say:
- **"Let's do Phase 1 on {feature}"** — start a planning conversation
- **"Let's do Phase 2 on {feature}"** — produce the implementation checklist
- **"Let's do Phase 3 on {feature}"** — run the Polish pass
- **"Check my work on Y2"** — mid-Split-Track handoff signal

Attach the relevant `docs/` file(s) when invoking a phase so the AI has full context.
