# Dynamic Template Accumulator — Technical Plan

This document provides a structured technical plan for building the **Dynamic Template Accumulator** within the employee tools app. It covers types, MongoDB schemas, and React components.

---

## Overview

**Goal:** A "types-first" tool for customer service and sales to build complex communications (emails, scripts) by navigating a declarative tree. As users click through levels (e.g., *Sales → Web Lead → Preferred Program*), the tool **accumulates** content fragments into a Tiptap editor and syncs with CRM data for real-time pricing and personalization.

---

## 1. Core Data Model (MongoDB & TypeScript)

Uses a **Recursive Tree Structure**. Every item in the navigation (a category, sub-category, or final script) is a `TreeNode`.

```typescript
// types/template.ts

export type TreeNodeType = 'category' | 'fragment' | 'input';

export interface TreeNode {
  _id: string;
  parentId: string | null;
  label: string;             // Tab/Button text (e.g., "Sales", "Web Lead")
  type: TreeNodeType;

  // The content this node adds to the editor
  payload?: {
    blockId: string;         // Unique ID for "swapping" logic (e.g., "intro", "program")
    body: string;            // Tiptap-compatible HTML or JSON string
    subject?: string;        // Only used if this node sets the email subject
  };

  // Logic for the Builder
  metadata?: {
    triggersCrmFetch?: boolean; // Does selecting this require a price calculation?
    requiredInputs?: string[];  // e.g., ["sqFt", "customerId"]
  };
}
```

---

## 2. Application State Architecture

The frontend tracks the **active path** and **injected fragments** to manage the Accumulator logic.

```typescript
// store/useTemplateStore.ts

interface AccumulatorState {
  activePath: string[];              // Array of selected TreeNode IDs
  fragments: Record<string, string>; // Maps blockId -> content (e.g., "program" -> "Preferred...")
  crmData: {
    customerId?: string;
    sqFt?: number;
    calculatedPrice?: number;
    customerName?: string;
  };
}
```

---

## 3. Implementation Phases

### Phase 1 — Recursive Navigator (UI)

Build a component that renders the tree as a vertical stack of rows using **Progressive Disclosure**.

**Component:** `TemplateStack.tsx`

**Logic:**
1. Render Level 0 (nodes where `parentId === null`).
2. When a node is clicked, fetch children where `parentId === selectedId`.
3. If children exist, render a new row of `Tabs` or `ToggleGroup`.
4. If no children exist (leaf node), signal the Accumulator to finalize the fragment.

---

### Phase 2 — Tiptap Canvas

Configure the editor to handle **Smart Variables** from the CRM.

- **Extension:** Use Tiptap's `Mention` or a custom `Node` extension to create **Variable Chips**.
- **Sync Logic:** Create a helper `syncCrmVariables(content, crmData)` that performs a regex or node-replace on the editor's state whenever `crmData` changes.

---

### Phase 3 — Swapping Engine

Ensure that when a user changes their mind (e.g., switches from *Preferred* to *Economy*), the editor **replaces** the old fragment rather than appending new text.

**Logic:** When a node is selected, check its `payload.blockId`. If a fragment with that `blockId` already exists in the `fragments` state, overwrite it and re-render the editor content.

---

### Phase 4 — CRM Integration (API Layer)

Create the bridge between UI inputs and the CRM.

- **Trigger:** Nodes where `triggersCrmFetch: true`.
- **Action:** Call the internal API (e.g., `POST /api/pricing`) using `sqFt` and `programId`. Update `calculatedPrice` in global state, which automatically reflects in the Tiptap Variable Chips.

---

## 4. Cline Prompt

> *"I am building a Dynamic Template Accumulator for a service business. We are using React (shadcn/ui), Tiptap, and MongoDB.*
>
> *Please help me implement the following:*
>
> - **MongoDB Schema:** Create a Mongoose schema for `TreeNode` that supports recursive parent/child relationships and stores 'fragments' of text.
> - **Recursive UI:** Build a component that renders these nodes as a vertical stack of tab rows. Selecting a node should 'push' a new row of sub-categories if they exist.
> - **Tiptap Integration:** Set up a Tiptap editor that accepts content fragments. Implement a 'Variable Node' that visually highlights placeholders like `{{price}}` or `{{customer_name}}`.
> - **Logic:** When a user selects a node, its content should be added to the editor. If the node has a `blockId` that matches an existing fragment in the editor, it should **replace** that block rather than appending.
> - **Data Sync:** Create a mock CRM integration where entering a 'Square Footage' input updates a price variable inside the Tiptap editor based on a simple calculation."*

---

## 5. Success Metrics

| Test | Criteria |
|---|---|
| **The Kiera Test** | Can Kiera build a new path (e.g., *A/R → Late Payment → Email*) in the DB and have it appear in the UI without a code deploy? |
| **The Price Test** | If a rep changes the lawn size, does every `{{price}}` tag in the Tiptap editor update instantly? |
| **The Clean Output Test** | Does the *Copy to Clipboard* function strip UI elements and produce a clean, professional email ready for Gmail or Outlook? |
