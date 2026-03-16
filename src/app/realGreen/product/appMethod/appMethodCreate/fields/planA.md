# Plan A: Lock Solution with Button

## Overview
User must explicitly lock the solution before adjusting units. Lock Solution button toggles between locked/unlocked states.

## Behavior

### Before Locking (Default State)
- Solver is active and running
- When 3 fields selected, solver calculates 4th field
- Calculated field is entirely disabled (all inputs + units)
- User sees solver results but cannot modify them

### After Clicking "Lock Solution"
1. Solver is disabled (no longer called)
2. Solution values are written to Redux state
3. First value of solved field remains disabled (anchor)
4. Other values and units become enabled for editing
5. Modifying other values/units triggers conversion that recalculates first value

### After Clicking "Unlock Solution"
1. Solver re-enabled
2. Solved field values cleared from Redux state
3. All inputs of solved field become disabled again
4. Solver recalculates based on 3 input fields

## Implementation Requirements

### Redux State Changes
- Add `lockSolution()` action - writes solution to state, sets `solutionLocked = true`
- Add `unlockSolution()` action - sets `solutionLocked = false`, clears solved field
- `solutionLocked` state already exists

### Selector Changes
- Merged selectors check `solutionLocked` state
- If locked: return Redux state (allows user edits)
- If not locked: return solution if available (current behavior)

### Component Changes
- Wire Lock/Unlock button onClick handler
- Field components conditionally disable:
  - All inputs when: `solveForField === thisField && !solutionLocked`
  - First input when: `solveForField === thisField && solutionLocked`
  - Other inputs when: `solveForField === thisField && solutionLocked` ’ ENABLED

### Conversion Hooks
- Create 4 hooks (one per field type)
- Each hook:
  - Stores base rate when solution first locked
  - Watches for unit/value changes
  - Recalculates first value using UnitMath
  - Dispatches updated first value to Redux

## Example User Flow

### Scenario: FlowRate calculated as 0.007071 gal/1sec

**Step 1: Initial Solve**
- User enters GroundSpeed, PatternWidth, Coverage
- Solver calculates FlowRate = 0.007071 gal/1sec
- FlowRate field shows this but is entirely disabled

**Step 2: Lock Solution**
- User clicks "Lock Solution" button
- FlowRate values written to Redux state
- Volume input (0.007071) remains disabled
- VolumeUnit, Time, TimeUnit become enabled

**Step 3: Adjust Units**
- User changes VolumeUnit to "Fl Oz"
- Conversion hook recalculates: 0.007071 gal ’ 0.905 fl oz
- Volume input updates to 0.905 (still disabled)

**Step 4: Adjust Time**
- User changes Time to 15
- Conversion hook recalculates: 0.905 fl oz × (15/1) = 13.6 fl oz
- Volume input updates to 13.6

**Step 5: Final Result**
- FlowRate now shows: 13.6 fl oz / 15 sec
- User can calibrate equipment: "collect 13.6 fl oz in 15 seconds"

**Step 6: Unlock (Optional)**
- User clicks "Unlock Solution"
- Solver re-enabled
- FlowRate field entirely disabled again
- If user changes GroundSpeed, solver recalculates FlowRate

## Pros
-  Explicit user control (clear when solver vs conversion is active)
-  User understands when they're "editing" vs "viewing" solver results
-  Can toggle back to solver if needed
-  Clear mental model: "Lock to edit"

## Cons
- L Requires extra button click
- L More complex state management (lock/unlock logic)
- L User might not discover lock feature
- L Two modes to understand (locked vs unlocked)
