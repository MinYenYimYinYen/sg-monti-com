# CSP Normalization & Production Commission

## The Problem

Lawn care technicians produce wildly different daily output profiles depending on their route:

| Employee | Count | Size (sq ft) | Price |
|---|---|---|---|
| Employee A | 22 | 145 | $1,400 |
| Employee B | 11 | 400 | $1,900 |

Who worked harder? Raw count favors A (more stops). Raw size favors B (more lawn). Raw price is somewhere in between. None of them alone is fair as a commission basis.

This is the core challenge of production-based compensation in a lawn care operation: **the job mix varies by route, not by effort**.

---

## The Solution: Effort Normalization Against a Model Employee

The idea is to define a **model employee** — someone with a long history of every kind of daily production that can happen — and use their historical average as the standard unit of effort. Every other employee's daily output is then expressed as a fraction of that standard.

### Step 1: Establish the model employee's unit rates

Given the model employee's average daily CSP:

```
model = { count: 17, size: 220, price: $1,602 }
```

This defines what a "normal day" looks like. It is the anchor.

### Step 2: Compute a normalized effort score for any employee

For any employee's daily CSP, compute how many "model-days-worth" of effort they produced in each dimension:

```
ratio_count = emp.count / model.count
ratio_size  = emp.size  / model.size
ratio_price = emp.price / model.price
```

Then combine with weights:

```
effortScore = w_count × ratio_count
            + w_size  × ratio_size
            + w_price × ratio_price
```

Where `w_count + w_size + w_price = 1`.

**Example with equal weights (1/3 each):**

| Employee | Count ratio | Size ratio | Price ratio | Effort score |
|---|---|---|---|---|
| A (22, 145, $1,400) | 22/17 = 1.29 | 145/220 = 0.66 | 1400/1602 = 0.87 | **0.94** |
| B (11, 400, $1,900) | 11/17 = 0.65 | 400/220 = 1.82 | 1900/1602 = 1.19 | **1.22** |

If a model day pays $200 in commission:
- Employee A earns **$188** (94% of a model day)
- Employee B earns **$244** (122% of a model day)

This correctly rewards B for the extra application time on large lawns, and A for the extra setup/teardown time on many stops.

---

## The Weight Problem

The weights are the key policy decision. They encode your belief about what actually drives effort:

- **High `w_count`**: Job count is the primary driver — setup, teardown, driving between stops
- **High `w_size`**: Lawn size is the primary driver — application time scales with area
- **High `w_price`**: Revenue-proportional pay — employees earn a cut of what they generate

Choosing weights arbitrarily is a policy choice. But there is a **data-driven way** to derive them.

---

## Deriving Weights from Data: Coefficient of Variation

The model employee's historical data set contains hundreds of daily CSP observations. Each day, count, size, and price vary. The dimension that varies the most (relative to its mean) is the one that most distinguishes a hard day from an easy day — and therefore should carry the most weight.

**Coefficient of Variation (CV)** = standard deviation / mean

```
CV_count = std(daily counts) / mean(daily counts)
CV_size  = std(daily sizes)  / mean(daily sizes)
CV_price = std(daily prices) / mean(daily prices)
```

Normalize to weights:

```
total = CV_count + CV_size + CV_price
w_count = CV_count / total
w_size  = CV_size  / total
w_price = CV_price / total
```

**Why this works:** If size barely varies (every lawn is ~200 sq ft) but count varies wildly (5 to 30 stops), then count is the real signal of effort variation and should dominate. The CV captures exactly this — it measures how much each dimension actually swings in practice.

### Example

Suppose the model employee's history shows:

| Dimension | Mean | Std Dev | CV |
|---|---|---|---|
| Count | 17 | 6.2 | 0.365 |
| Size | 220 | 48 | 0.218 |
| Price | 1,602 | 310 | 0.194 |

Total CV = 0.365 + 0.218 + 0.194 = 0.777

Weights:
- `w_count = 0.365 / 0.777 ≈ 0.47`
- `w_size  = 0.218 / 0.777 ≈ 0.28`
- `w_price = 0.194 / 0.777 ≈ 0.25`

These weights say: job count drives ~47% of effort variation, size drives ~28%, and price drives ~25%. This is derived entirely from the model employee's actual production history — no guessing required.

---

## A Note on Price Redundancy

`price` is not fully independent of `count` and `size` — bigger lawns cost more, more stops generate more revenue. Including all three dimensions risks double-counting the effort signal already present in count and size.

A cleaner approach may be to use only `count` and `size` as the **effort dimensions**, and treat `price` as the **output dimension** (what you pay commission on):

```
effortScore = w_count × (emp.count / model.count)
            + w_size  × (emp.size  / model.size)

commission  = effortScore × targetDailyPay
```

This separates the question of "how hard did they work?" from "how much revenue did they generate?" — which may be the right framing for a fair compensation system.

---

## Adding Route Distance to the Model

### The Problem with Ignoring Transit

Two employees produce identical CSP on the same day. But one worked a tight local cluster five miles from the shop; the other drove 35 miles out to a scattered corridor route. The second employee had less available production time — transit consumed it. Ignoring this systematically underpays employees with far or spread-out routes.

### The Data You Already Have

Every customer has a lat/lng coordinate. The shop has a fixed location. No external API is needed — all computation is local geometry.

### Two Route Metrics Per Day

**1. Centroid distance** — how far from the shop was the day's work, on average?

```
centroidLat = mean(lat of all serviced customers that day)
centroidLng = mean(lng of all serviced customers that day)
centroidDist = haversine(shop, {centroidLat, centroidLng})  // miles
```

**2. Route spread** — how scattered were the stops from each other?

```
routeSpread = mean(haversine(customer_i, customer_j) for all pairs i, j where i < j)
```

For 20 stops this is 190 pairs; for 30 stops it's 435 pairs. Trivial computation.

These two metrics together capture what a single centroid cannot. A corridor route perpendicular to the shop direction has a centroid that may appear close to the shop, but high spread reveals the actual driving burden.

### The Route Sub-Score

Combine the two metrics into a single route score, normalized against the model employee's averages:

```
routeScore = α × (emp.centroidDist / model.centroidDist)
           + β × (emp.routeSpread  / model.routeSpread)
```

Where `α + β = 1` (e.g., 0.6/0.4 — distance from shop matters more than internal spread, but both count).

### Integrating Route into the Full Effort Score

Route becomes a fourth dimension alongside count and size:

```
effortScore = w_count × (emp.count / model.count)
            + w_size  × (emp.size  / model.size)
            + w_route × routeScore
```

Where `w_count + w_size + w_route = 1`.

### Deriving `w_route` from Data

The CV method extends naturally. The model employee's history now has four time series:

| Dimension | Time series |
|---|---|
| Count | daily stop counts |
| Size | daily sq ft totals |
| Centroid distance | daily centroid-to-shop miles |
| Route spread | daily mean pairwise stop distance |

Compute CV for each, normalize to weights. If the model employee's routes are always tight and local, route CV will be low and `w_route` will be small — the system automatically discounts it. If routes vary wildly day to day, route earns more weight.

**A reasonable manual starting point:** reserve 15–20% for route (`w_route = 0.15–0.20`), with count and size splitting the remainder proportionally by their CVs.

### Interpretation

Route score is a **capacity adjustment**, not a production metric. A far/scattered day didn't produce more — it had less available time to produce. `w_route` compensates for time lost to transit, not for output achieved.

| Scenario | What gets credited |
|---|---|
| 22 small lawns, tight local cluster | High count, low route — fair |
| 11 large lawns, far scattered route | High size, high route — fair |
| 15 medium lawns, far tight cluster | Medium size, high centroid, low spread — fair |

### Known Limitation

The corridor-perpendicular-to-shop case remains an approximation. A route that runs east-west when the shop is due north will have a centroid that appears close to the shop, and spread captures the east-west extent but not the actual drive path. For a commission system averaged over many days, this error is acceptable — it only becomes a systematic bias if a specific employee *always* gets that exact route geometry, which is unlikely in practice.

---

## Implementation Path

When ready to build this:

1. **Select the model employee** — longest history, most varied route mix
2. **Pull their historical daily CSPs** — already available via the lookback system in `paceSelect.ts` (`selectEmployeeLookbackMap`)
3. **Compute mean and std dev** for count and size across all valid production days
4. **Derive CV-based weights** — store as config (updates as history grows)
5. **Compute route metrics per day** — haversine centroid distance and mean pairwise spread from per-customer lat/lng (already stored on every customer)
6. **Derive CV-based weights for all dimensions** — count, size, centroid distance, route spread
7. **Apply to any employee's daily output** — `effortScore = w_count × (emp.count / model.count) + w_size × (emp.size / model.size) + w_route × routeScore`
8. **Commission = effortScore × targetDailyPay**

The data infrastructure is already in place. The math is straightforward. The main design decisions are:
- Whether to include price in the effort score or treat it as a separate output metric
- Whether to derive `w_route` from CV or set it manually (15–20% is a reasonable starting point)
- The internal split between centroid distance and route spread within `routeScore` (α/β)

