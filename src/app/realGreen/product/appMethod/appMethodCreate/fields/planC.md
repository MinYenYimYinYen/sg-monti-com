# Plan C: Selector-Based Conversion (Zero State Changes!)

## Overview
**Revolutionary approach**: Don't write solution to Redux state at all! Instead, create smart selectors that convert the solver's result to match whatever units the user has selected in Redux state.

## The Key Insight

When a field is being solved for:
- **First value**: Empty in Redux state → Selector converts solution to user's chosen units
- **Units/Other values**: User can freely edit these in Redux state
- **No state writing needed**: Selectors do all the work on-the-fly

### Why This Works

Redux state ALREADY contains the user's unit preferences:
```typescript
// Redux state when flowRate is being solved:
{
  flowRateVolume: "",           // Empty (being calculated)
  flowRateVolumeUnit: "Fl Oz",  // User selected this
  flowRateTime: 15,             // User entered this
  flowRateTimeUnit: "Seconds"   // User selected this
}

// Solver result:
solution.result.flowRate = {
  volume: 0.007071,
  volumeUnit: "Mixed Gal",
  time: 1,
  timeUnit: "Seconds"
}

// Selector converts solver result to match Redux units:
convertedVolume = convertFlowRate(
  solution.result.flowRate,  // Source
  state.flowRateVolumeUnit,  // Target volume unit
  state.flowRateTime,        // Target time value
  state.flowRateTimeUnit     // Target time unit
)
// Returns: 13.6 (fl oz)
```

## Behavior

### Initial State (< 3 fields selected)
- All fields show normal input behavior
- User can set any units they want
- Nothing is disabled

### After Selecting 3 Fields (Solution Available)
1. Solver calculates 4th field
2. First value selector converts solution to match user's units
3. First value input becomes disabled (shows converted value)
4. Other values/units remain enabled (already in Redux state)
5. User can immediately adjust units/values

### When User Adjusts Units/Values
- User changes `flowRateVolumeUnit` from "Gal" to "Fl Oz"
- Selector automatically recalculates volume using new unit
- No Redux state write needed - selector just re-runs
- First value updates instantly

### When User Changes Input Fields
- User modifies GroundSpeed
- Solver recalculates FlowRate
- New solution returned with new values
- Selector converts new solution to current Redux units
- First value updates (stays disabled)
- Other values/units unchanged (still in Redux state)

## Implementation Requirements

### Redux State Changes
- **NONE!** No new actions, no state writing
- Keep existing state exactly as-is
- `solutionLocked` can be removed (not needed)

### Selector Changes

Update `fieldComponentsSelect.ts` with conversion logic:

```typescript
// Example for FlowRate volume
const selectFlowRateVolumeWithSolution = createSelector(
  [
    selectFlowRateVolume,        // Redux state (empty if being solved)
    solverSelect.solveForField,  // Which field is being solved
    solverSelect.solution,       // Solver result
    selectFlowRateVolumeUnit,    // User's chosen volume unit
    selectFlowRateTime,          // User's chosen time value
    selectFlowRateTimeUnit       // User's chosen time unit
  ],
  (stateValue, solveForField, solution, volumeUnit, time, timeUnit) => {
    // If not solving for flowRate, return Redux state
    if (solveForField !== "flowRate") {
      return stateValue;
    }

    // If no solution yet, return empty
    if (!solution?.success) {
      return "";
    }

    // Convert solver result to user's chosen units
    const baseRate = UnitMath.volumeRate(
      solution.result.flowRate.volume,
      solution.result.flowRate.volumeUnit,
      solution.result.flowRate.time,
      solution.result.flowRate.timeUnit
    );

    // If user hasn't set units yet, use solver's units
    const targetVolumeUnit = volumeUnit || solution.result.flowRate.volumeUnit;
    const targetTime = time || solution.result.flowRate.time;
    const targetTimeUnit = timeUnit || solution.result.flowRate.timeUnit;

    // Calculate volume for user's chosen time/units
    const rateInTargetUnits = baseRate.toVolumeRate(targetVolumeUnit, targetTimeUnit);
    return rateInTargetUnits * targetTime;
  }
);
```

### Component Changes
- Remove Lock/Unlock button entirely
- Field components:
  - First input disabled when `solveForField === thisField`
  - Other inputs always enabled
  - No special logic needed - just read from selectors!

### Conversion Logic
- **All in selectors!** No hooks needed
- Each field type gets conversion selector
- Selectors use UnitMath for conversions
- Pure functions, fully memoized

## Example User Flow

### Scenario: FlowRate calculated from other 3 fields

**Step 1: User Selects 3 Fields**
- User selects: GroundSpeed, PatternWidth, Coverage
- FlowRate is unselected (will be solved)
- User can pre-set FlowRate units if desired:
  - VolumeUnit: "Fl Oz"
  - Time: 15
  - TimeUnit: "Seconds"

**Step 2: User Fills 3 Fields**
- User enters GroundSpeed, PatternWidth, Coverage values
- Solver calculates FlowRate = 0.007071 gal/1 sec

**Step 3: Solution Converted Automatically**
- Selector sees:
  - Solution: 0.007071 gal/1 sec
  - User's units: Fl Oz / 15 sec
- Selector converts: 13.6 fl oz
- Volume input shows 13.6 (disabled)
- Other inputs show user's choices (enabled)

**Step 4: User Adjusts Units**
- User changes VolumeUnit to "mL"
- Selector re-runs automatically
- New volume: 402 mL (13.6 fl oz = 402 mL)
- Volume input updates to 402 (still disabled)

**Step 5: User Changes Time**
- User changes Time to 10
- Selector re-runs
- New volume: 268 mL (maintaining same flow rate)
- Volume input updates to 268

**Step 6: User Changes Input Field**
- User modifies GroundSpeed
- Solver recalculates new FlowRate
- New solution: 0.005 gal/1 sec (different!)
- Selector converts to user's current units (mL / 10 sec)
- Volume updates to 189 mL

## Implementation Details

### PatternWidth (Simplest)

```typescript
const selectPatternWidthDistanceWithSolution = createSelector(
  [stateValue, solveForField, solution, distanceUnit],
  (stateValue, solveForField, solution, distanceUnit) => {
    if (solveForField !== "patternWidth" || !solution?.success) {
      return stateValue;
    }

    const baseDistance = UnitMath.distance(
      solution.result.patternWidth.distance,
      solution.result.patternWidth.distanceUnit
    );

    const targetUnit = distanceUnit || solution.result.patternWidth.distanceUnit;
    return baseDistance.toDistance(targetUnit);
  }
);
```

### GroundSpeed

```typescript
const selectGroundSpeedDistanceWithSolution = createSelector(
  [stateValue, solveForField, solution, distanceUnit, time, timeUnit],
  (stateValue, solveForField, solution, distanceUnit, time, timeUnit) => {
    if (solveForField !== "groundSpeed" || !solution?.success) {
      return stateValue;
    }

    const baseRate = UnitMath.distanceRate(
      solution.result.groundSpeed.distance,
      solution.result.groundSpeed.distanceUnit,
      solution.result.groundSpeed.time,
      solution.result.groundSpeed.timeUnit
    );

    const targetDistanceUnit = distanceUnit || solution.result.groundSpeed.distanceUnit;
    const targetTime = time || solution.result.groundSpeed.time;
    const targetTimeUnit = timeUnit || solution.result.groundSpeed.timeUnit;

    const rateInTargetUnits = baseRate.toDistanceRate(targetDistanceUnit, targetTimeUnit);
    return rateInTargetUnits * targetTime;
  }
);
```

### FlowRate

```typescript
const selectFlowRateVolumeWithSolution = createSelector(
  [stateValue, solveForField, solution, volumeUnit, time, timeUnit],
  (stateValue, solveForField, solution, volumeUnit, time, timeUnit) => {
    if (solveForField !== "flowRate" || !solution?.success) {
      return stateValue;
    }

    const baseRate = UnitMath.volumeRate(
      solution.result.flowRate.volume,
      solution.result.flowRate.volumeUnit,
      solution.result.flowRate.time,
      solution.result.flowRate.timeUnit
    );

    const targetVolumeUnit = volumeUnit || solution.result.flowRate.volumeUnit;
    const targetTime = time || solution.result.flowRate.time;
    const targetTimeUnit = timeUnit || solution.result.flowRate.timeUnit;

    const rateInTargetUnits = baseRate.toVolumeRate(targetVolumeUnit, targetTimeUnit);
    return rateInTargetUnits * targetTime;
  }
);
```

### Coverage

```typescript
const selectCoverageVolumeWithSolution = createSelector(
  [stateValue, solveForField, solution, volumeUnit, area, areaUnit],
  (stateValue, solveForField, solution, volumeUnit, area, areaUnit) => {
    if (solveForField !== "coverage" || !solution?.success) {
      return stateValue;
    }

    const baseRate = UnitMath.volumePerArea(
      solution.result.coverage.volume,
      solution.result.coverage.volumeUnit,
      solution.result.coverage.area,
      solution.result.coverage.areaUnit
    );

    const targetVolumeUnit = volumeUnit || solution.result.coverage.volumeUnit;
    const targetArea = area || solution.result.coverage.area;
    const targetAreaUnit = areaUnit || solution.result.coverage.areaUnit;

    const rateInTargetUnits = baseRate.toVolumePerArea(targetVolumeUnit, targetAreaUnit);
    return rateInTargetUnits * targetArea;
  }
);
```

## Non-Anchor Field Selectors

For time/unit selectors, we need similar logic:

```typescript
// FlowRate time selector
const selectFlowRateTimeWithSolution = createSelector(
  [stateTime, solveForField, solution],
  (stateTime, solveForField, solution) => {
    // If being solved, provide default from solution if user hasn't set
    if (solveForField === "flowRate" && solution?.success && !stateTime) {
      return solution.result.flowRate.time;
    }
    return stateTime;
  }
);

// FlowRate timeUnit selector
const selectFlowRateTimeUnitWithSolution = createSelector(
  [stateTimeUnit, solveForField, solution],
  (stateTimeUnit, solveForField, solution) => {
    // If being solved, provide default from solution if user hasn't set
    if (solveForField === "flowRate" && solution?.success && !stateTimeUnit) {
      return solution.result.flowRate.timeUnit;
    }
    return stateTimeUnit;
  }
);
```

## Pros
- ✅ **Zero state changes** - no Redux actions needed
- ✅ **Fully reactive** - selectors automatically re-run when dependencies change
- ✅ **No timing issues** - no "when to write" problems
- ✅ **Simpler code** - no hooks, no useEffects, just pure selectors
- ✅ **Immediate adjustments** - user can change units anytime
- ✅ **Solver stays active** - always recalculates when inputs change
- ✅ **Precision guaranteed** - always converts from base solution
- ✅ **Memoized** - createSelector caches results

## Cons
- ❌ Unit selectors might show empty until user selects (minor UX issue)
  - **Solution**: Default to solver's units if user hasn't chosen
- ❌ Conversion logic in selectors (could be complex)
  - **Solution**: Well-tested UnitMath makes this straightforward
- ❌ More selector code
  - **Solution**: But less total code (no hooks, no state management)

## Why This Is Better Than Plan B

| Aspect | Plan B | Plan C |
|--------|--------|--------|
| Redux state writes | Needed | **None!** |
| Timing issues | Yes (when to write?) | **No** |
| Conversion hooks | 4 hooks with useEffect | **No hooks needed** |
| Code location | Spread across hooks | **All in selectors** |
| Re-renders | Can cause extra renders | **Optimally memoized** |
| Complexity | Medium | **Low** |
| Testability | Need to test hooks | **Pure functions** |

## Edge Cases Handled

### 1. User Pre-Sets Units
- User sets FlowRate units before selecting fields
- When FlowRate becomes solved, selector uses those units
- Works perfectly!

### 2. User Changes Units Multiple Times
- Each change triggers selector re-run
- Always converts from original solution
- No cumulative errors

### 3. Solver Recalculates
- New solution comes in
- Selector gets new base values
- Converts new solution to current units
- Seamless update

### 4. Empty Unit Values
- If user hasn't set units, use solver's units
- Fallback: `targetUnit = userUnit || solutionUnit`

### 5. Switching Solved Field
- User changes from 3 fields to different 3 fields
- `solveForField` changes
- Previous solved field selector returns Redux state
- New solved field selector activates
- Perfect!

## Implementation Checklist

### Phase 1: Update Selectors
- [ ] Update `selectFlowRateVolumeWithSolution` with conversion logic
- [ ] Update `selectFlowRateTimeWithSolution` with default logic
- [ ] Update `selectFlowRateTimeUnitWithSolution` with default logic
- [ ] Update `selectFlowRateVolumeUnitWithSolution` with default logic

- [ ] Update `selectGroundSpeedDistanceWithSolution` with conversion logic
- [ ] Update `selectGroundSpeedTimeWithSolution` with default logic
- [ ] Update `selectGroundSpeedDistanceUnitWithSolution` with default logic
- [ ] Update `selectGroundSpeedTimeUnitWithSolution` with default logic

- [ ] Update `selectCoverageVolumeWithSolution` with conversion logic
- [ ] Update `selectCoverageAreaWithSolution` with default logic
- [ ] Update `selectCoverageVolumeUnitWithSolution` with default logic
- [ ] Update `selectCoverageAreaUnitWithSolution` with default logic

- [ ] Update `selectPatternWidthDistanceWithSolution` with conversion logic
- [ ] Update `selectPatternWidthDistanceUnitWithSolution` with default logic

### Phase 2: Update Components
- [ ] Update field components to disable first input when solved
- [ ] Remove Lock/Unlock button from AppMethodCreate
- [ ] Remove `solutionLocked` state

### Phase 3: Test
- [ ] Test each field type being solved
- [ ] Test unit changes
- [ ] Test time/area value changes
- [ ] Test solver recalculation
- [ ] Test switching solved fields
- [ ] Test precision across multiple conversions

## Recommendation

**Plan C is the cleanest solution** because:
1. No state management complexity
2. All logic in one place (selectors)
3. Fully reactive and memoized
4. Pure functions = easy to test
5. No timing/synchronization issues

This is the approach I recommend implementing.
