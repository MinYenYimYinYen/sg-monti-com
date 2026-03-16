# Plan B: Always-Enabled Units (No Lock Button)

## Overview
First value always disabled, other values/units always enabled. Solver writes initial values on first solve, then user can adjust anytime. No lock button needed.

## Behavior

### Initial State (< 3 fields selected)
- All fields show normal input behavior
- Nothing is disabled

### After Selecting 3 Fields (Solution Available)
1. Solver calculates 4th field values
2. Solution values automatically written to Redux state (one-time)
3. First value of solved field becomes disabled (anchor)
4. Other values and units remain enabled
5. User can immediately adjust units/values without clicking anything

### When User Adjusts Units/Values
- Conversion logic automatically recalculates first value
- Works exactly like Plan A's locked state
- No mode switching needed

### When User Changes Input Fields
- If user changes one of the 3 input fields
- Solver recalculates 4th field
- New solution written to Redux state
- First value updates (stays disabled)
- Other values reset to solver's new values

## Implementation Requirements

### Redux State Changes
- Remove `solutionLocked` state (not needed)
- Add logic to `selectSolution` selector:
  - When solution first becomes available, dispatch action to write values to state
  - This is a "side effect" in selector, may need to move to a useEffect in component

### Selector Changes
- Merged selectors simplified:
  - Always return Redux state (no solution/state switching)
  - Redux state gets populated by solver on first solve

### Component Changes
- Remove Lock/Unlock button entirely
- Field components always:
  - Disable first input when `solveForField === thisField`
  - Enable other inputs when `solveForField === thisField`

### Conversion Hooks
- Same as Plan A
- Always active when `solveForField === thisField`
- Store base rate from Redux state on mount/when solution changes

### Solution Writing Logic
- Need mechanism to write solution to Redux when it first appears
- Options:
  - **A) useEffect in AppMethodCreate.tsx**: Watch `solution`, write to Redux when it changes
  - **B) Middleware**: Intercept solution changes, auto-write to state
  - **C) Selector with side-effect**: When solution changes, dispatch write action

## Example User Flow

### Scenario: FlowRate calculated as 0.007071 gal/1sec

**Step 1: Initial Solve**
- User enters GroundSpeed, PatternWidth, Coverage
- Solver calculates FlowRate = 0.007071 gal/1sec
- Values automatically written to Redux state
- Volume input (0.007071) is disabled
- VolumeUnit, Time, TimeUnit are enabled

**Step 2: Adjust Units (No Lock Needed!)**
- User immediately changes VolumeUnit to "Fl Oz"
- Conversion hook recalculates: 0.007071 gal ’ 0.905 fl oz
- Volume input updates to 0.905 (still disabled)

**Step 3: Adjust Time**
- User changes Time to 15
- Conversion hook recalculates: 0.905 fl oz × (15/1) = 13.6 fl oz
- Volume input updates to 13.6

**Step 4: Final Result**
- FlowRate shows: 13.6 fl oz / 15 sec
- User can calibrate equipment: "collect 13.6 fl oz in 15 seconds"

**Step 5: User Changes Input Field**
- User modifies GroundSpeed
- Solver recalculates new FlowRate
- New values written to Redux state
- Volume updates (disabled)
- Other inputs reset to new solver values
- User can adjust units again if desired

## Key Difference from Plan A
The solved field is **always in "conversion mode"** - there's no locked/unlocked toggle. The first value is always the anchor, other inputs are always adjustable.

## How Solver Stays Active
- Solver continues running in the background
- When user changes any of the 3 input fields, solver recalculates
- New solution overwrites the Redux state values
- This "resets" the solved field to new values
- User can then adjust units/values again for the new solution

## Handling the Write-to-Redux Challenge

### Option 1: useEffect in AppMethodCreate (Recommended)
```typescript
// In AppMethodCreate.tsx
useEffect(() => {
  if (solution?.success && solveForField) {
    // Write solution values to Redux state
    writeSolutionToState(solution.result, solveForField);
  }
}, [solution, solveForField]);
```

**Pros:**
- Clear location for side effect
- Easy to understand
- Standard React pattern

**Cons:**
- Writes on every solution change (might trigger multiple times)
- Need to prevent infinite loops

### Option 2: Write Only on solveForField Change
```typescript
// Only write when the solve-for field changes (new field selected)
useEffect(() => {
  if (solution?.success && solveForField) {
    writeSolutionToState(solution.result, solveForField);
  }
}, [solveForField]); // Only when solveForField changes
```

**Pros:**
- Writes only once per field selection
- Cleaner, fewer writes

**Cons:**
- Doesn't update if solution changes while same field is being solved for
- Might miss updates if user changes input values

### Option 3: Selector-Driven with Ref (Advanced)
Track previous solution in a ref, only write when it actually changes.

## Pros
-  Simpler UX (no lock button to discover/understand)
-  Immediate adjustment capability (no extra click)
-  Fewer states to manage (no locked/unlocked mode)
-  More intuitive: "This value is calculated, but I can change the units"
-  Solver stays active (responds to input field changes)

## Cons
- L Less explicit control (user might not understand why first value is disabled)
- L Slightly more complex: when to write solution to state?
- L Solution values in state might become "stale" if solver changes
- L Harder to "reset" to original solver values (no unlock button)

## Recommendation
**Plan B is better for UX** if we can cleanly handle the write-to-Redux timing. The key is ensuring solution values are written to state exactly once per solve, then allowing user to freely adjust units/values.
