# Tech Feedback — Post-Finish Loadout Analysis

## Goal

After a tech submits their finish loadout form, give them immediate feedback comparing what the truck consumed against what RealGreen recorded as applied. This closes the loop for the tech and surfaces data entry errors or real product discrepancies on the same day.

## Entry Point

On `page.tsx`, the "Finish Loadout" employee chips currently show a `CheckCircle` icon and are disabled (`cursor-not-allowed`) when `doc.isStored === true`. Instead of disabling the chip, make it **clickable** and navigate to a new analysis route:

```
/scheduling/dailyInventory/techFeedback/[employeeId]
```

The chip behavior becomes:
- No loadout started → greyed out, not clickable (unchanged)
- Loadout started, not stored → clickable → navigates to finish form (unchanged)
- Loadout stored (`isStored === true`) → clickable → navigates to tech feedback page

## Data Sources

### 1. Loadout (truck perspective)
`LoadoutDoc` from `loadoutSlice.ts` — already in Redux state via `getLoadouts`.

For each product: `usedAmount = startAmount - finishAmount`

Products to flatten from the loadout:
- `masters[].equipments[].constituents[]` — liquid products (skip productId === -2, the water carrier)
- `masters[].subProducts[]` — granular sub-products under a master
- `singles[]` — ad-hoc single products
- `subProducts[]` — top-level custom sub-products

### 2. Production (RealGreen perspective)
`ProductionCore.usedAppProductCores: AppProductCore[]` from completed services (`status === "S"`).

`AppProductCore`:
- `productId` — which product
- `amount` — how much RealGreen recorded as applied (app units)
- `size` — treated area (ksf)
- `servId` — which service

To get the RealGreen total for a product on a given day for a given employee:
1. Filter `services` where `lastAssigned.employeeId === employeeId` and `lastAssigned.schedDate === routeDate` and `status === "S"`
2. Flatten all `service.productionCore.usedAppProductCores` across those services
3. Sum `amount` per `productId`

`useRecentProduction` already fetches this data. `centralSelect.customers` already has hydrated `Service` objects with `productionCore`.

## Report Shape

One row per product:

| Product | Planned | Loaded (Start) | RG Applied | Truck Used | Delta | Delta % |
|---|---|---|---|---|---|---|
| 46-0-0 Soluble Urea | 187 lbs | 0 lbs | 92 lbs | 0 lbs | -92 lbs | — |
| Stonewall 65WDG | 60 fl oz | 0 fl oz | 30 fl oz | 0 fl oz | -30 fl oz | — |
| 13-0-5 .37 Prodiamine | 508 lbs | 750 lbs | 164 lbs | 700 lbs | +536 lbs | +327% |

Where:
- **Planned** = `LoadoutDoc` constituent/subProduct `plannedAmount`
- **Loaded** = `startAmount`
- **RG Applied** = sum of `AppProductCore.amount` for this `productId` across all completed services for this employee/date
- **Truck Used** = `startAmount - finishAmount`
- **Delta** = `Truck Used - RG Applied` (positive = truck used more than RG recorded; negative = RG recorded more than truck used)
- **Delta %** = `Delta / RG Applied * 100` (skip if RG Applied is 0)

## Delta Interpretation

| Delta | Likely Cause |
|---|---|
| ≈ 0 | Clean — truck and RealGreen agree |
| Truck Used > RG Applied | Product wasted/spilled, or services not yet posted in RG |
| RG Applied > Truck Used | Services recorded but not done, or start/finish amounts entered incorrectly |

## Architecture Notes

- The analysis is **read-only** — no new API calls needed if `getLoadouts` and `useRecentProduction` have already run (both are triggered in `layout.tsx`).
- Build a selector in `loadoutSelect.ts` (or a new `techFeedbackSelect.ts`) that takes `(employeeId, routeDate)` and returns the flattened comparison rows.
- The page route is `src/app/scheduling/dailyInventory/techFeedback/[employeeId]/page.tsx`.
- Use `loadoutStartSelect.routeDate` for the date (already in Redux state from the start form).
- Units: use `unitConfigDisplay.format()` on the hydrated product for display. The loadout stores amounts in "app" units; `AppProductCore.amount` is also in app units — no conversion needed for the comparison math, only for display.
- The water carrier (productId === -2) has no `AppProductCore` counterpart — skip it in the comparison.

## Open Questions

- Should the feedback page also show services that were completed but have no matching product in the loadout (i.e., RG recorded a product the tech never loaded)?
- Should we surface a "total treated area" comparison (sum of `AppProductCore.size` vs `LoadoutDoc.masters[].plannedAmount`)?
- Should the delta threshold for flagging a discrepancy be configurable (e.g., in `globalSettings`)?
