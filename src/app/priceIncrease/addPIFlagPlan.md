# Add Price Increase Flag — Planning Document

This document captures the requirements that must be satisfied before writing the API route and UI for assigning price increase flags to customers in the CRM (RealGreen).

---

## Background

The price increase module calculates which `IncreaseFlag` each customer should receive. The flag is the only write-back to the CRM — it communicates the approved increase percentage to RealGreen, which then applies the price change.

Flag assignment can happen:
- **Individually** — user assigns a flag to a single customer from the By Customer view
- **En masse** — user assigns flags to all eligible customers in one operation

---

## Data Model: `preExistingIncreaseFlags`, `effectiveFlag`, and `preExistingFlagStatus`

Each `CustomerIncreaseResult` carries:

- `resolvedFlag: IncreaseFlag | null` — the flag the module computed
- `preExistingIncreaseFlags: IncreaseFlag[]` — recognized increase flags already on the customer
- `effectiveFlag: IncreaseFlag | null` — the flag that will actually be used:
  - `preExistingIncreaseFlags.length === 0` → `effectiveFlag = resolvedFlag` (normal)
  - `preExistingIncreaseFlags.length === 1` → `effectiveFlag = preExistingIncreaseFlags[0]` (pre-existing wins, whether matching or override)
  - conflict cases → `effectiveFlag = null` (unresolvable)
- `groupable.preExistingFlagStatus: "none" | "matching" | "override" | "conflict"`

### Conflict Definition

A customer is in `"conflict"` state if **any** of the following are true:
1. `preExistingIncreaseFlags.length > 1` — multiple recognized increase flags
2. `preExistingIncreaseFlags.length >= 1 && isExempt` — has an increase flag AND is exempt
3. `preExistingIncreaseFlags.length >= 1 && isManual` — has an increase flag AND is manual

All three cases represent inconsistent flag state that must be resolved manually in RealGreen before any automated flag assignment.

---

## Pre-flight Requirements

All of the following must be satisfied before any flag assignment (individual or en masse) can proceed:

### 1. No Conflicts in Batch

Any customer with `preExistingFlagStatus === "conflict"` **must be resolved manually in RealGreen** before they can be included in any flag assignment operation. Conflicts include:
- Multiple recognized increase flags on the customer
- An increase flag alongside an exempt flag
- An increase flag alongside a manual flag

- **Individual**: block assignment for that specific customer; show a clear error message.
- **En masse**: the presence of any conflict customer in the batch must block the entire operation. The user must resolve all conflicts first.

### 2. Exempt Customers Excluded

Customers with `groupable.isExempt === true` are never assigned a flag by this module. They must be excluded from both individual and en masse operations.

### 3. Manual Customers — Separate Handling

Customers with `groupable.isManual === true` should be excluded from en masse operations by default. Individual assignment may be allowed with an explicit confirmation.

### 4. No Flag to Assign

If `effectiveFlag === null` (conflict case, or no `resolvedFlag` and no pre-existing flag), no assignment can be made. Skip silently in en masse; show error in individual.

---

## Individual Assignment

**Trigger**: User clicks an "Assign Flag" button on a single `CustomerIncreaseCard`.

**Logic**:
1. Check `preExistingFlagStatus`:
   - `"conflict"` → block, show error: "Customer has conflicting flags. Resolve in RealGreen first."
   - `"matching"` → skip (already correct); optionally show "Already assigned" confirmation.
   - `"override"` → the pre-existing flag is already the effective flag. No assignment needed unless the user explicitly wants to re-assign the module's `resolvedFlag`. This case needs UX design.
   - `"none"` → assign `resolvedFlag` to the customer.
2. Call the RealGreen API to add the flag.
3. On success: call `refreshCustomer(custId)` — the RTK listener in `custFlagListeners.ts` automatically fires `refreshCustFlags` which reconciles `custFlag` state. The selector chain recomputes reactively.

---

## En Masse Assignment

**Trigger**: User clicks an "Assign All" button in the By Customer view header or summary panel.

**Pre-flight gate** (must all pass before the operation begins):
1. Zero customers with `preExistingFlagStatus === "conflict"` in the current view/batch.
2. Exempt customers are excluded from the batch automatically.
3. Manual customers are excluded from the batch automatically (or user confirms inclusion).

**Eligible customers** (those that will receive a flag assignment):
- `preExistingFlagStatus === "none"` AND `resolvedFlag !== null` → assign `resolvedFlag`
- `preExistingFlagStatus === "override"` → pre-existing flag already applied; skip (no write needed)
- `preExistingFlagStatus === "matching"` → already correct; skip

**Batch construction**:
- Build a list of `{ custId, flagId }` pairs for all eligible customers.
- Group by `flagId` to minimize API calls (one call per flag, with a list of custIds).

**On success**:
- Call `refreshCustomer(custId)` for each assigned customer — the RTK listener handles `custFlag` reconciliation automatically.
- Show a summary toast: "X flags assigned, Y skipped (already correct), Z skipped (override)."

---

## API Shape (TBD — Pending RealGreen API Research)

The RealGreen API endpoint for adding a flag to a customer needs to be identified. Key questions:

- What is the endpoint URL and HTTP method?
- What is the request body shape? (`custId`, `flagId`, or different field names?)
- Does it support batch assignment (multiple custIds in one call)?
- What does the response look like on success/failure?
- Are there rate limits or concurrency constraints?
- Does adding a flag automatically remove conflicting flags, or must old flags be removed first?

**Action required**: Research the RealGreen API documentation or proxy layer before writing the API route.

---

## Post-Assignment State Update

After a successful flag assignment, call `refreshCustomer(custId)` from `useActiveCustomers`. The RTK listener in `custFlagListeners.ts` automatically fires `custFlagActions.refreshCustFlags` after any `refreshCustomer.fulfilled` action, which:

1. Calls `GET /Customer/{custId}/Flags` via the `refreshCustFlags` route
2. Filters the result to only the `flagIdsInState` already loaded
3. Updates `custFlag.flagIdCustIds` by adding/removing the custId from each entry
4. `centralSelectors` re-hydrates `customer.flags` from the updated map
5. `customerIncreaseResultsSelect` recomputes `preExistingIncreaseFlags`, `effectiveFlag`, and `preExistingFlagStatus` automatically

No manual state mutation is needed — the selector chain handles the update reactively.

---

## Removing Old Flags Before Assigning New Ones

If a customer has a pre-existing increase flag that differs from the new flag to be assigned (`preExistingFlagStatus === "override"`), the old flag must be removed from the customer before (or as part of) assigning the new one.

- **Question**: Does the RealGreen API support atomic flag swap (remove + add in one call)?
- If not: remove old flag first, then add new flag. Handle partial failure.
- This scenario only applies when the user explicitly chooses to override the pre-existing flag (not the default behavior — by default, the pre-existing flag is the effective flag and no write is needed).

---

## UI Requirements

- [x] Conflict warning badge on cards with `preExistingFlagStatus === "conflict"` (formula strip shows "Conflict → Resolve flags")
- [x] Override indicator on cards with `preExistingFlagStatus === "override"` (formula strip shows "Override → [flag desc]")
- [x] Exempt/manual flag descriptions shown as destructive badges in card header
- [x] Pre-existing increase flag descriptions shown as primary badges in card header
- [x] Refresh button on each `CustomerIncreaseCard` (triggers `refreshCustomer` + automatic `custFlag` reconciliation)
- [ ] "Assign Flag" button on `CustomerIncreaseCard` (individual)
- [ ] "Assign All" button in the By Customer view header
- [ ] Pre-flight conflict gate UI (list of customers that must be resolved before en masse)
- [ ] Progress indicator during en masse assignment
- [ ] Summary toast after en masse assignment
- [ ] Confirmation dialog for manual customer inclusion in en masse

---

## Files That Will Need to Be Created

| File | Purpose |
|---|---|
| `src/app/priceIncrease/assignFlag/api/route.ts` | API route: calls RealGreen to add a flag to a customer |
| `src/app/priceIncrease/assignFlag/api/AssignFlagContract.ts` | RPC contract for the route |
| `src/app/priceIncrease/assignFlag/assignFlagSlice.ts` | Redux slice for assignment state (pending, success, error per custId) |
| `src/app/priceIncrease/assignFlag/useAssignFlag.ts` | Hook exposing individual and en masse assignment actions |
| `src/app/priceIncrease/results/_components/AssignFlagButton.tsx` | Individual assignment button for `CustomerIncreaseCard` |
| `src/app/priceIncrease/results/_components/AssignAllButton.tsx` | En masse assignment button + pre-flight gate UI |

## Files Already Created (custFlag Infrastructure)

| File | Purpose |
|---|---|
| `src/app/realGreen/custFlag/_lib/CustFlagTypes.ts` | Added `CustFlagRefreshResult` type |
| `src/app/realGreen/custFlag/api/CustFlagContract.ts` | Added `refreshCustFlags` operation |
| `src/app/realGreen/custFlag/api/route.ts` | Added `refreshCustFlags` handler (calls `GET /Customer/{custId}/Flags`) |
| `src/app/realGreen/custFlag/_lib/custFlagSlice.ts` | Added `refreshCustFlags` thunk + reducer case |
| `src/app/realGreen/custFlag/_lib/custFlagListeners.ts` | RTK listener: fires `refreshCustFlags` after any `refreshCustomer.fulfilled` |
| `src/store/index.ts` | Registered `custFlagListenerMiddleware` |
