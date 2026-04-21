 - Lessons learned from src/app/quickSend_bad
   - It was too complicated.
     - The tree structure (types first) approach resulted in railroading development
     - The tree structure persistence was rigid and hard to maintain.
     - We should use foreign keys and flat objects when persisting.
   - It is possible to use @ variables with tiptap to insert html on the fly.
     - simple text
       - depending on the @ variable selected, UI above the editor should render fields for the user to fill in.
         - alternatively/additionally, in the case of name/size variables, the UI should expose a customer lookup input (custId)
           - If user inputs a custId, and the customer exists, the tiptap editor @ variables should be replaced with the customer's name/size.
         - When the user inputs values for the @ variables, the tiptap editor should be updated.
     - tables are also possible to insert
       - this requires a logic system to handle table structure
       - the logic system is not trivial
         - table structure should be predefined, so end user can simply insert rows by selecting progCode(s)/servCode(s)
         - we should not have column headers
       - the goal for a table in a template is to insert pricing for the servCodes of a progCode.
       - the progCode(s) should be selectable by the user.
       - Behavior:
         - @ProgCode should:
           - expose UI outside of tiptap display component that allows user to select progCode(s), then allow deselect of servCodes.
           - pricing should be default based on # of servCodes selected.
           - pricing for services within a progCode should also be editable (override default pricing)
   - End user should be able to persist a template they have created.
     - This is not how src/app/quickSend_bad worked.  Templates were always pre-defined.

---

## Cline Plan

### Core Architecture

The new QuickSend is **editor-first**. The Tiptap editor is the primary artifact. The left panel is **reactive** — it shows controls based on what `@` variables are currently present in the editor content, not based on a pre-defined template tree.

This is the opposite of `quickSend_bad`, where the left panel was statically configured per template node. Here, the user composes freely in the editor and the UI adapts to what they've inserted.

**Persistence** is user-authored: the user creates a template, names it, and saves it. Storage is flat (Tiptap HTML + variable state), not a tree structure.

---

### Development Steps

#### Step 1 — Blank editor (current)
**Goal:** Prove the editor works. No `@` support, no data fetching.

Files:
- `src/app/quickSend/page.tsx` — Next.js page entry
- `src/app/quickSend/QuickSend.tsx` — Two-panel layout (left placeholder + right editor)
- `src/app/quickSend/QuickSendEditor.tsx` — Tiptap editor with Copy button

Left panel: fixed-width, placeholder text ("Controls coming soon").
Right panel: Tiptap editor (StarterKit + table extensions), Copy button copies `text/html` + `text/plain`.

---

#### Step 2 — `@customerName` and `@customerSize` variables
**Goal:** Live variable resolution from customer lookup or manual input.

Behavior:
- User types `@` in the editor → suggestion menu shows `customerName`, `customerSize`
- Selecting one inserts a styled mention span (e.g. `{{customerName}}`)
- Left panel **reacts**: when either variable is present in the editor, show:
  - Customer ID input + Search button → dispatches customer lookup
  - Manual name input (shown when no customer loaded, or to override)
  - Manual size input (shown when `@customerSize` is present)
- When customer is loaded or manual values change, the mention spans in the editor are replaced with the resolved values in real time

---

#### Step 3 — `@progTable` insertion
**Goal:** Insert a live-updating pricing table driven by progCode/servCode selection.

Behavior:
- User types `@progTable` → inserts a table placeholder node into the editor
- Left panel **reacts**: when a progTable is present, show:
  - ProgCode selector (dropdown from Redux `progServSelect.progCodes`)
  - ServCode deselect (checkboxes to exclude individual services from the selected progCode)
  - Per-service price override (editable price per servCode row; default = calculated from # of services selected)
- Table has no column headers
- Table HTML is regenerated live whenever progCode, servCode selection, or prices change
- The table node in the editor is replaced with the new HTML on each change

---

#### Step 4 — Persistence (future)
**Goal:** User can name and save a template.

Storage model: flat document containing:
- Template name
- Tiptap HTML content (the raw editor HTML with mention spans intact)
- Variable state snapshot (custId, manual overrides, progCode selection, servCode overrides, prices)

User can load a saved template, which restores the editor content and left-panel state.

---

### What We Are NOT Building
- A pre-defined template tree (the `quickSend_bad` approach)
- Admin-only template authoring — end users author their own templates
- Complex block/choice/group systems
