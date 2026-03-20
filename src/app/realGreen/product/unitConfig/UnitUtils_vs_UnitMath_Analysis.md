# Analysis: UnitUtils vs UnitMath - DRY Violation?

## Executive Summary
**Verdict: NOT a DRY violation** ✅

While both classes handle unit conversions, they serve **fundamentally different purposes** and operate at different abstraction levels. This is a case of **proper separation of concerns** rather than duplication.

---

## Purpose & Design Philosophy

### UnitUtils: Static Unit Conversion
**Role:** Immediate, single-step unit conversions
**Pattern:** Utility class with static methods
**Use Case:** "Convert X gallons to fluid ounces"

```typescript
// Convert 5 gallons to fluid ounces
const flOz = UnitUtils.volume(5, UnitLabel.mGal).to(UnitLabel.flOz); // 640
```

**Key Characteristics:**
- ✅ Stateless conversions
- ✅ Single transformation per call
- ✅ No dimensional tracking
- ✅ Simple, direct API
- ✅ Used for UI display, simple calculations

### UnitMath: Dimensional Analysis Engine
**Role:** Multi-step calculations with automatic dimension tracking
**Pattern:** Immutable value objects with arithmetic operations
**Use Case:** "Calculate coverage from flow rate, speed, width, and overlap"

```typescript
// Complex calculation with automatic unit handling
const flowRate = UnitMath.volumeRate(3, UnitLabel.mGal, 1, UnitLabel.min);
const groundSpeed = UnitMath.distanceRate(90, UnitLabel.ft, 17.5, UnitLabel.sec);
const width = UnitMath.distance(11, UnitLabel.ft);
const overlap = UnitMath.scalar(2);

const coverage = flowRate
  .multiply(overlap)
  .divide(groundSpeed)
  .divide(width);

const result = coverage.toVolumePerArea(UnitLabel.mGal, UnitLabel.ksf);
```

**Key Characteristics:**
- ✅ Stateful dimension tracking (volume¹, length⁻², time⁻¹, etc.)
- ✅ Chainable operations (multiply, divide)
- ✅ Automatic dimension validation
- ✅ Physics-based calculations
- ✅ Used for solver algorithms, complex domain logic

---

## Where They Share Code (Intentionally)

Both classes use the **same conversion constants** - this is **correct sharing**, not duplication:

```typescript
// UnitUtils.ts
private static readonly AREA_TO_SQ_FT: Record<AreaUnit["desc"], number> = {
  [UnitLabel.sf]: 1,
  [UnitLabel.ksf]: 1000,
};

// UnitMath.ts (uses UnitUtils internally)
static area(area: number, areaUnit: AreaUnit["desc"]): UnitMath {
  const sqFeet = UnitUtils.area(area, areaUnit).to(UnitLabel.sf);
  return new UnitMath(sqFeet, { length: 2 });
}
```

**Key Point:** UnitMath **delegates** to UnitUtils for conversions, then adds dimensional tracking on top. This is **composition**, not duplication.

---

## Comparison: hydrateRate.ts Implementation

### Approach 1: UnitUtils (Lines 20-26)
```typescript
const areaInKsf = UnitUtils.area(
  appMethod.coverage.area,
  appMethod.coverage.areaUnit as AreaUnit["desc"]
).to(UnitLabel.ksf);
const rate = appMethod.coverage.volume / areaInKsf;
```

**What it does:**
1. Converts area to ksf
2. Manually divides volume by converted area
3. Returns raw number

**Pros:**
- ✅ Simple, direct
- ✅ Minimal overhead
- ✅ Clear intent
- ✅ Good for one-off conversions

**Cons:**
- ⚠️ No validation that volume and area units are compatible
- ⚠️ Manual calculation (could make arithmetic errors)
- ⚠️ Doesn't track what the result represents

### Approach 2: UnitMath (Lines 28-40, commented)
```typescript
const rateCalc = UnitMath.volumePerArea(
  appMethod.coverage.volume,
  appMethod.coverage.volumeUnit as VolumeUnit["desc"],
  appMethod.coverage.area,
  appMethod.coverage.areaUnit as AreaUnit["desc"]
);
const rate = rateCalc.toVolumePerArea(
  appMethod.coverage.volumeUnit as VolumeUnit["desc"],
  UnitLabel.ksf
);
```

**What it does:**
1. Creates a `UnitMath` object representing "volume per area" (dimensions: {volume: 1, length: -2})
2. Converts both volume AND area to target units
3. Returns raw number with dimension validation

**Pros:**
- ✅ Validates dimensions (ensures result is actually volume/area)
- ✅ Handles volume unit conversion automatically (if needed)
- ✅ Type-safe dimension tracking
- ✅ Catches dimension errors at runtime

**Cons:**
- ⚠️ More verbose for simple cases
- ⚠️ Additional object allocation overhead
- ⚠️ Overkill if you know dimensions are correct

---

## When to Use Each

### Use UnitUtils when:
- ✅ Converting single units for display (e.g., "Show in gallons")
- ✅ Simple one-step conversions
- ✅ Building UI components (dropdowns, formatters)
- ✅ Performance-critical hot paths
- ✅ You know the dimensions are correct

### Use UnitMath when:
- ✅ Multi-step calculations (AppMethodSolver)
- ✅ Complex formulas with mixed units
- ✅ Need to validate dimensional consistency
- ✅ Building solvers/algorithms
- ✅ Calculations that could have dimension errors

---

## Specific Analysis: hydrateRate.ts

### Current Context
```typescript
// We know:
// - appMethod.coverage.volume is a volume (Gal or Lbs)
// - appMethod.coverage.area is an area (SF or ksf)
// - Result should be rate per ksf
```

### Recommendation: **Use UnitUtils (Approach 1)** ✅

**Reasons:**
1. **Known dimensions:** We already know this is volume/area
2. **Simple calculation:** Single division operation
3. **Performance:** Called frequently in selectors (Redux)
4. **Clarity:** Intent is clear - just normalize area to ksf
5. **Sufficient:** Volume is already in correct units (no conversion needed)

**When UnitMath would be better:**
- If volume unit also needed conversion (e.g., Gal → FlOz)
- If dimensions were uncertain or complex
- If calculation involved multiple steps

---

## Code Relationship Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    UnitTypes.ts                          │
│  (Shared constants: AREA_TO_SQ_FT, VOLUME_TO_GALLONS)   │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌─────────▼────────┐
│   UnitUtils    │    │    UnitMath      │
│                │    │                  │
│ • area()       │◄───┤ • area()         │  (delegates to UnitUtils)
│ • volume()     │    │ • volumePerArea()│  (adds dimensions)
│ • time()       │    │ • multiply()     │
│                │    │ • divide()       │
└────────────────┘    └──────────────────┘
        │                       │
        └───────────┬───────────┘
                    │
            ┌───────▼────────┐
            │  Application   │
            │     Code       │
            │                │
            │ • hydrateRate  │ (uses UnitUtils)
            │ • AppMethod    │ (uses UnitMath)
            │   Solver       │
            └────────────────┘
```

---

## Conclusion

### Is this a DRY violation? **NO**

**Reasons:**
1. **Different Abstraction Levels:**
   - UnitUtils: Low-level conversion utilities
   - UnitMath: High-level dimensional analysis

2. **Different Use Cases:**
   - UnitUtils: Direct conversions, display formatting
   - UnitMath: Physics calculations, solver algorithms

3. **Composition, Not Duplication:**
   - UnitMath **uses** UnitUtils internally
   - Shared constants stored once in UnitTypes
   - No duplicate conversion logic

4. **Follows Single Responsibility:**
   - UnitUtils: Convert units
   - UnitMath: Track dimensions and perform calculations

### Analogy
This is like having both:
- **`parseInt()`** - simple string-to-number conversion
- **`BigNumber`** - complex arbitrary-precision arithmetic

Both deal with numbers, but serve different purposes. Not a DRY violation.

---

## Recommendations

### ✅ Current Design is Good
Keep both classes. They complement each other well.

### 🔄 Potential Improvements
1. **Document the distinction** (this file helps!)
2. **Add decision guide** to docs: "When to use which?"
3. **Consider factory methods** on UnitMath for common patterns:
   ```typescript
   UnitMath.fromCoverage(appMethod.coverage).toRate(UnitLabel.ksf)
   ```

### ⚠️ Watch For
- Using UnitMath for simple conversions (over-engineering)
- Using UnitUtils for complex calculations (error-prone)
- Duplicating conversion constants (keep them in UnitTypes)

---

## Related Files
- `UnitUtils.ts` - Static conversion utilities
- `UnitMath.ts` - Dimensional analysis engine
- `UnitTypes.ts` - Shared constants and types
- `hydrateRate.ts` - Example usage of both approaches
- `AppMethodSolver.ts` - Heavy UnitMath usage
- `productSelectors.ts` - Heavy UnitUtils usage
