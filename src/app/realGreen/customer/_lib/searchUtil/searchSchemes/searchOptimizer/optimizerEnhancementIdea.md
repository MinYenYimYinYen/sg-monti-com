# Batch Size Optimizer Enhancement Idea

## Current Algorithm

`calculateNextBatchSize` in `optimizerCalculations.ts` uses the **maximum response size** from the previous run to set the next batch size:

```ts
const TARGET_RESPONSE_RATIO = 0.9;
const TARGET_RECORDS = CustProgServRecordsMax * TARGET_RESPONSE_RATIO; // 450

const ratio = TARGET_RECORDS / maxRecordsFound;
newBatchSize = Math.floor(currentBatchSize * ratio);
```

The goal is to keep responses near 450 records (90% of the 500-record hard limit), avoiding overflow into recursive fetching. This is a sound safety-first approach.

---

## The Problem: Max-Based Optimization Converges Too Conservatively

The algorithm is dominated by the single densest batch. Because it targets the **max** response, it must keep the batch size small enough that even the most record-dense batch stays under 500. This leaves most batches significantly underutilized.

### Real-World Example (activeCustomers/services, 2026-09-09)

```
totalIds=4938, batchSize=78, expectedBatches=64

batch 1:  ids=78, rawRecords=332
batch 2:  ids=78, rawRecords=441
batch 3:  ids=78, rawRecords=127
batch 4:  ids=78, rawRecords=215
batch 5:  ids=78, rawRecords=179
batch 6:  ids=78, rawRecords=153
batch 7:  ids=78, rawRecords=364
batch 8:  ids=78, rawRecords=299
batch 9:  ids=78, rawRecords=153
batch 10: ids=78, rawRecords=199
batch 11: ids=78, rawRecords=112
batch 12: ids=78, rawRecords=352
batch 13: ids=78, rawRecords=369
batch 14: ids=78, rawRecords=137
batch 15: ids=78, rawRecords=210
batch 16: ids=78, rawRecords=110
batch 17: ids=78, rawRecords=399
batch 18: ids=78, rawRecords=416
batch 19: ids=78, rawRecords=136
batch 20: ids=78, rawRecords=192
batch 21: ids=78, rawRecords=118
batch 22: ids=78, rawRecords=421
batch 23: ids=78, rawRecords=350
batch 24: ids=78, rawRecords=167
batch 25: ids=78, rawRecords=205
batch 26: ids=78, rawRecords=142
batch 27: ids=78, rawRecords=302
batch 28: ids=78, rawRecords=423
batch 29: ids=78, rawRecords=171
batch 30: ids=78, rawRecords=198
batch 31: ids=78, rawRecords=126
batch 32: ids=78, rawRecords=336
batch 33: ids=78, rawRecords=419
batch 34: ids=78, rawRecords=140
batch 35: ids=78, rawRecords=216
batch 36: ids=78, rawRecords=123
batch 37: ids=78, rawRecords=395
batch 38: ids=78, rawRecords=367
batch 39: ids=78, rawRecords=155
batch 40: ids=78, rawRecords=205
batch 41: ids=78, rawRecords=111
batch 42: ids=78, rawRecords=387
batch 43: ids=78, rawRecords=362
batch 44: ids=78, rawRecords=153
batch 45: ids=78, rawRecords=224
batch 46: ids=78, rawRecords=124
batch 47: ids=78, rawRecords=374
batch 48: ids=78, rawRecords=375
batch 49: ids=78, rawRecords=149
batch 50: ids=78, rawRecords=206
batch 51: ids=78, rawRecords=171
batch 52: ids=78, rawRecords=99
batch 53: ids=78, rawRecords=439
batch 54: ids=78, rawRecords=355
batch 55: ids=78, rawRecords=168
batch 56: ids=78, rawRecords=204
batch 57: ids=78, rawRecords=156
batch 58: ids=78, rawRecords=447   ← max
batch 59: ids=78, rawRecords=254
batch 60: ids=78, rawRecords=248
batch 61: ids=78, rawRecords=183
batch 62: ids=78, rawRecords=234
batch 63: ids=78, rawRecords=231
batch 64: ids=24, rawRecords=28    ← partial last batch
```

**Stats (excluding last partial batch):**
- Max: 447 (batch 58)
- Average: ~252 records/batch
- Batches ≥ 450 records: **0 of 63** (none hit the overflow threshold)
- Batches ≥ 400 records: **6 of 63** (~10%)
- Batches < 200 records: **~20 of 63** (~32%)

**What happens next run:** The optimizer stores `lastMaxResponseSize = 447`. The ratio is `450/447 ≈ 1.007`, so `newBatchSize = floor(78 × 1.007) = 78`. **The optimizer barely moves.** It's stuck because the max is already close to the target.

**The waste:** The average batch returns only 252 records — 56% of the 450-record target. We're making 64 API calls when the data could theoretically fit in ~36 calls if we used the average density.

---

## Proposed Enhancement: Average-Density Optimization with Safety Cap

### Core Idea

Instead of targeting the max, target the **average records per ID** (density), with a safety cap derived from the max to prevent overflow on dense batches.

### New Fields Required in Optimizer State

Add `lastAvgResponseSize` to the `SearchOptimizer` type and MongoDB schema:

```ts
type SearchOptimizer = {
  // ... existing fields ...
  batchSize: number;
  lastMaxResponseSize: number;
  lastAvgResponseSize: number;  // NEW: average records per batch from last run
};
```

### New Algorithm

```ts
export function calculateNextBatchSize(
  currentBatchSize: number,
  maxRecordsFound: number,
  avgRecordsFound: number,  // NEW parameter
): { batchSize: number; lastMaxResponseSize: number; lastAvgResponseSize: number } {
  const HARD_LIMIT = 500;
  const SAFETY_FACTOR = 0.85; // 15% headroom above average
  const OVERFLOW_TOLERANCE = 0.10; // accept overflow on up to ~10% of batches

  if (maxRecordsFound === 0 || avgRecordsFound === 0) {
    // No data — ramp up aggressively
    return {
      batchSize: Math.min(currentBatchSize * 2, 1000),
      lastMaxResponseSize: 0,
      lastAvgResponseSize: 0,
    };
  }

  const avgRecordsPerID = avgRecordsFound / currentBatchSize;
  const maxRecordsPerID = maxRecordsFound / currentBatchSize;

  // Target: batch size that yields ~85% of HARD_LIMIT on average
  const targetByAvg = Math.floor((HARD_LIMIT * SAFETY_FACTOR) / avgRecordsPerID);

  // Safety cap: batch size that keeps the densest batches under HARD_LIMIT
  // Allow ~10% overflow tolerance (overflow triggers one extra API call, not a crash)
  const safetyCapByMax = Math.floor((HARD_LIMIT * (1 + OVERFLOW_TOLERANCE)) / maxRecordsPerID);

  const newBatchSize = Math.max(1, Math.min(targetByAvg, safetyCapByMax, 1000));

  return {
    batchSize: newBatchSize,
    lastMaxResponseSize: maxRecordsFound,
    lastAvgResponseSize: avgRecordsFound,
  };
}
```

### What Changes in `createBatchSizeStep`

Track the running total of records to compute the average at the end of the step:

```ts
let totalRecordsAcrossBatches = 0;
let batchCount = 0;

// Inside the batch loop, after each successful fetch:
totalRecordsAcrossBatches += batchTotalRecords;
batchCount++;

// At the end, compute average:
const avgRecordsFound = batchCount > 0
  ? Math.round(totalRecordsAcrossBatches / batchCount)
  : 0;

const optimizationUpdate = calculateNextBatchSize(
  batchSize,
  currentMaxRecords,
  avgRecordsFound,
);
```

### Applied to the Example Data

- `avgRecordsFound = 252`, `maxRecordsFound = 447`, `currentBatchSize = 78`
- `avgRecordsPerID = 252 / 78 = 3.23`
- `maxRecordsPerID = 447 / 78 = 5.73`
- `targetByAvg = floor(425 / 3.23) = 131`
- `safetyCapByMax = floor(550 / 5.73) = 96`
- `newBatchSize = min(131, 96) = 96`

**Result:** 96 IDs per batch instead of 78. With 4,938 total IDs:
- Current: `ceil(4938 / 78) = 64 batches`
- Enhanced: `ceil(4938 / 96) = 52 batches`
- **Savings: 12 fewer API calls (~19% reduction)**

The 10% overflow tolerance means ~5 of the 52 batches might exceed 500 records and trigger one extra overflow call each — a net cost of ~5 extra calls. Net savings: **~7 API calls** per full load.

---

## Why This Is Better

| Metric | Current (max-based) | Enhanced (avg-based + cap) |
|---|---|---|
| Batch size | 78 | 96 |
| Planned batches | 64 | 52 |
| Avg records/batch | 252 (56% utilization) | ~309 (69% utilization) |
| Overflow risk | ~0% | ~10% of batches |
| Extra overflow calls | 0 | ~5 |
| Net API call savings | — | ~7 calls |

The current algorithm guarantees zero overflow at the cost of significant underutilization. The enhanced algorithm accepts a small, bounded overflow rate in exchange for meaningfully fewer planned API calls.

---

## Long-Term: Rolling Average Across Runs

The `usageHistory` array already tracks call counts per day. A similar rolling average of `avgRecordsPerID` across the last N runs would make the algorithm self-tune more accurately over time, especially for schemes where data density changes seasonally (e.g., more services per program at the start of the season vs. end).

This could be stored as a simple exponential moving average:

```ts
const ALPHA = 0.3; // weight for the most recent run
const smoothedAvgPerID = ALPHA * currentAvgPerID + (1 - ALPHA) * storedAvgPerID;
```

This is a future enhancement — the single-run average is already a significant improvement over the current max-only approach.
