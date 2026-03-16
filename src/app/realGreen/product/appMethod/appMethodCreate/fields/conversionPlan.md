# Unit Conversion Strategy

## Core Concept

Each field type has a **base rate** that remains constant during unit conversions. The first value is the **anchor** that gets recalculated when other values/units change.

## Field Type Breakdown

### 1. PatternWidth (Simplest Case)
**Structure:** `distance` + `distanceUnit`

**Base Rate:** The distance value in base units (feet)

**Conversion Logic:**
- Store: `baseDistance = distance` (in feet)
- When `distanceUnit` changes:
  ```typescript
  newDistance = UnitMath.distance(baseDistance, AppUnit.ft).toDistance(newDistanceUnit)
  ```

**Example:**
- Solver calculates: 11 ft
- User changes unit to "inches"
- Result: 132 inches

**Hook: `usePatternWidthConversion.ts`**
```typescript
const baseRate = useRef<UnitMath | null>(null);

useEffect(() => {
  if (solveForField === 'patternWidth' && patternWidthDistance && patternWidthDistanceUnit) {
    // Store base rate on first render or when solution changes
    if (!baseRate.current) {
      baseRate.current = UnitMath.distance(patternWidthDistance, patternWidthDistanceUnit);
    }
  }
}, [solveForField, patternWidthDistance]);

useEffect(() => {
  if (baseRate.current && solveForField === 'patternWidth') {
    // Recalculate when unit changes
    const newDistance = baseRate.current.toDistance(patternWidthDistanceUnit);
    setPatternWidthDistance(newDistance);
  }
}, [patternWidthDistanceUnit]);
```

---

### 2. GroundSpeed (Rate: distance/time)
**Structure:** `distance` + `distanceUnit` + `time` + `timeUnit`

**Base Rate:** The speed in base units (feet per second)

**Conversion Logic:**
- Store: `baseRate = UnitMath.distanceRate(distance, distanceUnit, time, timeUnit)`
- When any of `distanceUnit`, `time`, `timeUnit` changes:
  ```typescript
  // Recalculate distance to maintain the base rate
  newDistance = baseRate.toDistanceRate(newDistanceUnit, newTimeUnit) * newTime
  ```

**Example:**
- Solver calculates: 90 ft / 17.5 sec
- Base rate: 5.14 ft/sec
- User changes to: 10 seconds
- Result: 51.4 ft / 10 sec (same speed)
- User changes to: inches / 10 seconds
- Result: 617 inches / 10 sec (same speed)

**Key Insight:**
The **distance** is the anchor (disabled). When user changes time or units, we recalculate distance to maintain the same speed.

**Hook: `useGroundSpeedConversion.ts`**
```typescript
const baseRate = useRef<UnitMath | null>(null);

useEffect(() => {
  if (solveForField === 'groundSpeed' && groundSpeedDistance && groundSpeedTime) {
    // Store base rate (feet per second)
    baseRate.current = UnitMath.distanceRate(
      groundSpeedDistance,
      groundSpeedDistanceUnit,
      groundSpeedTime,
      groundSpeedTimeUnit
    );
  }
}, [solveForField, groundSpeedDistance]); // Reset when solution changes

useEffect(() => {
  if (baseRate.current && solveForField === 'groundSpeed') {
    // Calculate distance for new time/units while maintaining base rate
    const rateInNewUnits = baseRate.current.toDistanceRate(
      groundSpeedDistanceUnit,
      groundSpeedTimeUnit
    );
    const newDistance = rateInNewUnits * groundSpeedTime;
    setGroundSpeedDistance(newDistance);
  }
}, [groundSpeedDistanceUnit, groundSpeedTime, groundSpeedTimeUnit]);
```

---

### 3. FlowRate (Rate: volume/time)
**Structure:** `volume` + `volumeUnit` + `time` + `timeUnit`

**Base Rate:** The flow rate in base units (gallons per second)

**Conversion Logic:**
- Store: `baseRate = UnitMath.volumeRate(volume, volumeUnit, time, timeUnit)`
- When any of `volumeUnit`, `time`, `timeUnit` changes:
  ```typescript
  // Recalculate volume to maintain the base rate
  newVolume = baseRate.toVolumeRate(newVolumeUnit, newTimeUnit) * newTime
  ```

**Example:**
- Solver calculates: 0.007071 gal / 1 sec
- Base rate: 0.007071 gal/sec
- User changes to: fl oz / 1 sec
- Result: 0.905 fl oz / 1 sec (same rate)
- User changes to: fl oz / 15 sec
- Result: 13.6 fl oz / 15 sec (same rate)

**Key Insight:**
The **volume** is the anchor (disabled). When user changes time or units, we recalculate volume to maintain the same flow rate.

**Hook: `useFlowRateConversion.ts`**
```typescript
const baseRate = useRef<UnitMath | null>(null);

useEffect(() => {
  if (solveForField === 'flowRate' && flowRateVolume && flowRateTime) {
    // Store base rate (gallons per second)
    baseRate.current = UnitMath.volumeRate(
      flowRateVolume,
      flowRateVolumeUnit,
      flowRateTime,
      flowRateTimeUnit
    );
  }
}, [solveForField, flowRateVolume]); // Reset when solution changes

useEffect(() => {
  if (baseRate.current && solveForField === 'flowRate') {
    // Calculate volume for new time/units while maintaining base rate
    const rateInNewUnits = baseRate.current.toVolumeRate(
      flowRateVolumeUnit,
      flowRateTimeUnit
    );
    const newVolume = rateInNewUnits * flowRateTime;
    setFlowRateVolume(newVolume);
  }
}, [flowRateVolumeUnit, flowRateTime, flowRateTimeUnit]);
```

---

### 4. Coverage (Rate: volume/area)
**Structure:** `volume` + `volumeUnit` + `area` + `areaUnit`

**Base Rate:** The coverage rate in base units (gallons per square foot)

**Conversion Logic:**
- Store: `baseRate = UnitMath.volumePerArea(volume, volumeUnit, area, areaUnit)`
- When any of `volumeUnit`, `area`, `areaUnit` changes:
  ```typescript
  // Recalculate volume to maintain the base rate
  newVolume = baseRate.toVolumePerArea(newVolumeUnit, newAreaUnit) * newArea
  ```

**Example:**
- Solver calculates: 0.25 gal / 1000 SF
- Base rate: 0.00025 gal/SF
- User changes to: fl oz / 1000 SF
- Result: 32 fl oz / 1000 SF (same coverage)
- User changes to: fl oz / 500 SF
- Result: 16 fl oz / 500 SF (same coverage)

**Key Insight:**
The **volume** is the anchor (disabled). When user changes area or units, we recalculate volume to maintain the same coverage rate.

**Hook: `useCoverageConversion.ts`**
```typescript
const baseRate = useRef<UnitMath | null>(null);

useEffect(() => {
  if (solveForField === 'coverage' && coverageVolume && coverageArea) {
    // Store base rate (gallons per square foot)
    baseRate.current = UnitMath.volumePerArea(
      coverageVolume,
      coverageVolumeUnit,
      coverageArea,
      coverageAreaUnit
    );
  }
}, [solveForField, coverageVolume]); // Reset when solution changes

useEffect(() => {
  if (baseRate.current && solveForField === 'coverage') {
    // Calculate volume for new area/units while maintaining base rate
    const rateInNewUnits = baseRate.current.toVolumePerArea(
      coverageVolumeUnit,
      coverageAreaUnit
    );
    const newVolume = rateInNewUnits * coverageArea;
    setCoverageVolume(newVolume);
  }
}, [coverageVolumeUnit, coverageArea, coverageAreaUnit]);
```

---

## Mathematical Foundation

### Why This Works

All conversions follow the same pattern:

1. **Store Base Rate in Dimensionally Correct Form**
   ```typescript
   baseRate = UnitMath.rate(value1, unit1, value2, unit2)
   // Stored internally in base units (gal, ft, sec)
   ```

2. **Convert Rate to New Units**
   ```typescript
   rateInNewUnits = baseRate.toRate(newUnit1, newUnit2)
   // Uses UnitUtils to convert between units
   ```

3. **Multiply by New Time/Area to Get New Value**
   ```typescript
   newValue1 = rateInNewUnits * newValue2
   // Maintains the same rate, different representation
   ```

### Example Calculation (FlowRate)

**Initial:** 0.007071 gal / 1 sec

```typescript
// Step 1: Store base rate
baseRate = UnitMath.volumeRate(0.007071, "gal", 1, "sec")
// Internally: 0.007071 gal/sec in base units

// Step 2: User changes to fl oz / 15 sec
rateInNewUnits = baseRate.toVolumeRate("fl oz", "sec")
// Result: 0.905 fl oz/sec

// Step 3: Multiply by new time
newVolume = 0.905 * 15
// Result: 13.6 fl oz

// Final: 13.6 fl oz / 15 sec
```

### Precision Guarantee

By storing the base rate in `UnitMath` and always converting from the base rate (never converting from current values), we avoid cumulative rounding errors:

**Bad (compounds rounding):**
```typescript
// User changes from gal ’ floz
volume = volume * 128 // Might lose precision

// User changes from floz ’ mL
volume = volume * 29.574 // More precision loss
```

**Good (always from base):**
```typescript
// User changes to any unit
volume = baseRate.toVolumeRate(newUnit, newTimeUnit) * time
// Always calculated from original base rate, no cumulative error
```

---

## Edge Cases & Considerations

### 1. Initial Value Setting
- When should we create the `baseRate`?
- **Answer:** When `solveForField === thisField` AND we have valid values from solver/Redux

### 2. Solution Changes
- What if solver recalculates while user is editing units?
- **Answer:** Reset `baseRate` when anchor value changes (watch `solveForField` and anchor value)

### 3. Empty Values
- What if user clears a field?
- **Answer:** Conversion hooks only active when all required values present

### 4. Unit Changes Only
- When unit changes but value stays same
- **Answer:** Always recalculate anchor from base rate (handles this automatically)

### 5. Multiple Value Changes
- What if user changes both time and timeUnit?
- **Answer:** Single `useEffect` watches all dependencies, recalculates once

---

## Implementation Checklist

### PatternWidth
- [ ] Create `usePatternWidthConversion.ts`
- [ ] Store base distance in UnitMath
- [ ] Recalculate on unit change
- [ ] Update `PatternWidthField.tsx` to disable first input

### GroundSpeed
- [ ] Create `useGroundSpeedConversion.ts`
- [ ] Store base rate (ft/sec) in UnitMath
- [ ] Recalculate distance when time/units change
- [ ] Update `GroundSpeedField.tsx` to disable distance input

### FlowRate
- [ ] Create `useFlowRateConversion.ts`
- [ ] Store base rate (gal/sec) in UnitMath
- [ ] Recalculate volume when time/units change
- [ ] Update `FlowRateField.tsx` to disable volume input

### Coverage
- [ ] Create `useCoverageConversion.ts`
- [ ] Store base rate (gal/sqft) in UnitMath
- [ ] Recalculate volume when area/units change
- [ ] Update `CoverageField.tsx` to disable volume input

---

## Testing Strategy

For each field type, verify:

1. **Initial Display:** Solver values appear correctly
2. **Unit Change:** Changing unit recalculates anchor correctly
3. **Value Change:** Changing non-anchor value recalculates anchor correctly
4. **Combined Change:** Changing multiple values/units simultaneously works
5. **Precision:** Multiple conversions don't introduce rounding errors
6. **Solution Update:** New solver result resets conversion correctly

### Test Case Example (FlowRate)

```typescript
// 1. Initial: 0.007071 gal / 1 sec
expect(volume).toBe(0.007071)
expect(volumeUnit).toBe("gal")
expect(time).toBe(1)
expect(timeUnit).toBe("sec")

// 2. Change volumeUnit to "fl oz"
setFlowRateVolumeUnit("fl oz")
expect(volume).toBeCloseTo(0.905) // 0.007071 * 128

// 3. Change time to 15
setFlowRateTime(15)
expect(volume).toBeCloseTo(13.6) // 0.905 * 15

// 4. Change timeUnit to "minute"
setFlowRateTimeUnit("minute")
expect(volume).toBeCloseTo(54.3) // 0.905 * 60

// 5. Verify rate is preserved
// 54.3 fl oz / 1 min = 0.905 fl oz / sec = 0.007071 gal / sec 
```
