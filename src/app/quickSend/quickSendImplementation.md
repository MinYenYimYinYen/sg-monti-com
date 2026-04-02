# QuickSend Implementation Guide

This document explains how the QuickSend template system works end-to-end — from data authoring in MongoDB to content appearing in the Tiptap editor — and provides a step-by-step plan for completing the implementation.

---

## Glossary

These terms are used throughout this document. They overlap in everyday language, so their precise meanings here are defined below.

| Term | Definition |
|---|---|
| **Node** | A single record in MongoDB (`TreeNodeDoc`). Every item in the navigation tree — whether a top-level tab or a final selectable option — is a node. |
| **Category** | A node with `type: "category"`. It has children. Selecting it reveals the next level of the tree. It does **not** produce any editor content on its own. |
| **Fragment** | A node with `type: "fragment"`. It is a leaf — it has no children. Selecting it produces a piece of HTML content that is injected into the editor. |
| **Leaf** | Synonym for a fragment node. A node with no children. The end of a navigation path. |
| **Block** | A named slot in the Tiptap editor, identified by `blockId` (e.g., `"program-block"`). When a fragment is selected, its HTML is placed into the block with the matching `blockId`. If a block already has content, it is **replaced** — not appended. This is the swapping engine. |
| **blockId** | The string key that identifies which block in the editor a fragment occupies. Two different fragments can share the same `blockId` (e.g., "Preferred" and "Economy" both occupy `"program-block"`), which is how swapping works — selecting one replaces the other. |
| **registryKey** | A string that points to an entry in the `componentRegistry` (code-side). It tells the system which React component to render for inputs and which `buildContent()` function to call to generate the HTML. Only dynamic fragments have a `registryKey`. |
| **Registry Entry** | A code-side object (in `componentRegistry.ts`) that pairs an `InputsComponent` (the form fields) with a `buildContent()` function (the HTML generator). One registry entry can be reused by many nodes (e.g., both "Preferred" and "Economy" nodes can use the same `"visitScheduleTable"` entry). |
| **Static Fragment** | A fragment node that has a `body` field (plain HTML) instead of a `registryKey`. No inputs are needed — the HTML is injected as-is. |
| **Dynamic Fragment** | A fragment node that has a `registryKey`. The HTML is generated at runtime by `buildContent()` using the current form inputs and customer data. |
| **Accumulator** | The runtime state that tracks which nodes the user has selected (`activePath`), what form inputs they've entered (`inputs`), and what HTML has been produced for each block (`fragments`). |

---

## Part 1: How `TreeNodeDoc` Is Produced and Consumed

### The Type

```typescript
type TreeNodeDoc = {
  nodeId: string;           // Natural key, e.g. "sales-web-lead-preferred"
  parentId: string | null;  // null = root level node
  label: string;            // Tab/button text shown in the UI
  type: "category" | "fragment";
  order: number;            // Sort order within a level

  fragment?: {              // Only present on "fragment" leaf nodes
    blockId: string;        // Slot ID in the editor (e.g. "program-block")
    registryKey?: string;   // Points to a componentRegistry entry (dynamic)
    body?: string;          // Static HTML (no registry needed)
    subject?: string;       // Sets the email subject line
  };
};
```

### Production: How Nodes Are Authored

Nodes are created directly in MongoDB (or via a future admin UI). A complete template path is a chain of nodes connected by `parentId`.

**Example: Sales → Web Lead → Preferred Program**

```
{ nodeId: "sales",              parentId: null,       type: "category", label: "Sales",    order: 0 }
{ nodeId: "sales-web-lead",     parentId: "sales",    type: "category", label: "Web Lead", order: 0 }
{ nodeId: "sales-web-lead-pref",parentId: "sales-web-lead", type: "fragment", label: "Preferred",
  fragment: { blockId: "program-block", registryKey: "visitScheduleTable" }, order: 0 }
```

**Two kinds of leaf nodes (fragments):**

1. **Dynamic** — has `registryKey`. The registry provides a React component for inputs and a `buildContent()` function that generates HTML from those inputs. Example: `visitScheduleTable` renders a sqFt input and builds a pricing table.

2. **Static** — has `body`. Plain HTML injected directly into the editor. No inputs needed. Example: a standard closing paragraph.

### Consumption: How the UI Uses Nodes

The `templateSelect.childrenOf(state, parentId)` selector returns the sorted children of any node. The navigator component calls this recursively as the user clicks through levels:

```
Level 0: childrenOf(state, null)         → ["Sales", "Cancels", "A/R"]
Level 1: childrenOf(state, "sales")      → ["Web Lead", "Upsell", "Estimate Follow-up"]
Level 2: childrenOf(state, "sales-web-lead") → ["Preferred", "Economy"]
```

When the user reaches a leaf node (`type: "fragment"`), the system reads `fragment.registryKey` or `fragment.body`:

- If `registryKey` → look up `componentRegistry[registryKey]`, render its `InputsComponent` in the left panel, call `buildContent(inputs, customer)` to produce HTML
- If `body` → inject the HTML directly, no inputs needed

The HTML is placed into the Tiptap editor at the slot identified by `fragment.blockId`. If a fragment with that `blockId` already exists in the editor, it is **replaced** (the swapping engine).

---

## Part 2: The Component Registry

The registry is a plain TypeScript object that maps `registryKey` strings to descriptor objects. It lives entirely in code — Kiera never touches it.

```typescript
// src/app/quickSend/componentRegistry.ts

type RegistryEntry = {
  InputsComponent: React.ComponentType<InputsComponentProps>;
  buildContent: (inputs: TemplateInputs, customer: Customer | null, repName: string) => string;
};

type ComponentRegistry = Record<string, RegistryEntry>;
```

**`InputsComponentProps`** — what every `InputsComponent` receives:
```typescript
type InputsComponentProps = {
  inputs: TemplateInputs;
  onChange: (patch: Partial<TemplateInputs>) => void;
};
```

**`TemplateInputs`** — the accumulated form state:
```typescript
type TemplateInputs = {
  sqFt?: number;
  programId?: string;   // "preferred" | "economy"
  // Add new keys here as new registry entries require them
};
```

**Example entry** (migrated from the prototype):
```typescript
visitScheduleTable: {
  InputsComponent: VisitScheduleInputs,   // renders sqFt + program picker
  buildContent: ({ sqFt, programId }, customer, repName) => {
    const visits = programId === "preferred" ? PREFERRED_VISITS : ECONOMY_VISITS;
    return buildVisitTable(visits, sqFt ?? 0, (sqFt ?? 0) * 4);
  },
},
```

---

## Part 3: The Accumulator State

The left panel manages an `AccumulatorState` that tracks the user's navigation path, the current form inputs, and the assembled editor fragments:

```typescript
type EditorFragment = {
  blockId: string;
  content: string;   // HTML produced by buildContent()
  subject?: string;
};

type AccumulatorState = {
  activePath: string[];                    // Selected nodeIds at each level
  fragments: Record<string, EditorFragment>; // blockId → fragment
  inputs: TemplateInputs;                  // Live form state
};
```

When the user selects a node:
1. `activePath` is updated (truncated at the current level, new nodeId appended)
2. If the node is a fragment with `registryKey`, `buildContent(inputs, customer, repName)` is called
3. The result is upserted into `fragments[blockId]`
4. The editor assembles all fragments in `order` sequence and calls `setContent()`

When the user changes an input (e.g., sqFt):
1. `inputs` is updated
2. `buildContent` is re-called for all active fragments that use that registry entry
3. The editor updates in real time

---

## Part 4: Step-by-Step Implementation Plan

### Step 1 — Component Registry scaffold
Create `src/app/quickSend/componentRegistry.ts` with the `RegistryEntry`, `TemplateInputs`, and `InputsComponentProps` types. Add the first entry: `visitScheduleTable`, migrated from the prototype's `buildVisitTable` function.

### Step 2 — Accumulator state (local React state or Redux slice)
Decide: local `useState` in `QuickSend.tsx` (simpler, no persistence) or a Redux slice (enables undo, persistence). For now, local state is sufficient. Create `useAccumulator.ts` hook that manages `activePath`, `fragments`, and `inputs`.

### Step 3 — `TemplateNavigator` component
Replace `TemplateTabs.tsx` with a data-driven `TemplateNavigator.tsx`. It reads from `templateSelect.childrenOf` at each level and renders tab rows. On leaf node selection, it signals the accumulator. Uses `useTemplate({ autoLoad: true })` to fetch nodes.

### Step 4 — `InputsPanel` component
A dynamic panel that renders the `InputsComponent` for the currently active registry entry (if any). Receives `inputs` and `onChange` from the accumulator. Renders nothing if the active node is a static fragment.

### Step 5 — `CustomerLookupPanel` component
A persistent panel at the top of the left side. Contains the customer ID input. Calls `useQuickSendCustomer().lookup(custId)` on change. Reads `useSelector(quickSendSelect.customer)` to display the customer name.

### Step 6 — Refactor `Editor.tsx`
Replace the single `buildWebLeadTemplate()` call with a fragment assembler. The editor receives `fragments: EditorFragment[]` sorted by node order and assembles them into a single HTML string. The `setContent()` call is triggered whenever `fragments` changes.

### Step 7 — Wire `QuickSend.tsx`
Compose all pieces: `useCustomerContext({ contexts: ["single"] })`, `useTemplate({ autoLoad: true })`, `useProgServ`, `useCallAhead`, and the accumulator hook. Pass state down to `TemplateNavigator`, `InputsPanel`, `CustomerLookupPanel`, and `Editor`.

### Step 8 — Seed MongoDB with initial template data
Create a seed script (or manual MongoDB insert) for the existing prototype paths:
- `Sales → Web Lead → Preferred` (registryKey: `"visitScheduleTable"`, blockId: `"program-block"`)
- `Sales → Web Lead → Economy` (registryKey: `"visitScheduleTable"`, blockId: `"program-block"`)

### Step 9 — Admin UI for template authoring (The Kiera Test)
Build a simple CRUD interface for `TreeNode` documents. Kiera can add new paths, assign `registryKey` or `body`, and set `order` without a code deploy. This is the final milestone.

---

## Summary: What Kiera Can Control vs. What Requires Code

| Concern | Kiera (DB) | Developer (Code) |
|---|---|---|
| Tree structure (categories, paths) | ✅ | |
| Which registry entry a leaf uses | ✅ | |
| Which blockId a fragment occupies | ✅ | |
| Static HTML fragments | ✅ | |
| Email subject lines | ✅ | |
| Tab labels and sort order | ✅ | |
| New dynamic block type (new formula/API) | | ✅ |
| New input type (new form field) | | ✅ |
