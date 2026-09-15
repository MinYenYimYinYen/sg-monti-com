# addCustFlag — RealGreen Write-Back Research Notes

## Endpoint

- **RealGreen path**: `POST /Customer/Flags/Add`
- **App route**: `POST /realGreen/custFlag/add/api`
- **RealGreen body**: `{ customerNumbers: number[]; flag: number }`
- **App params**: `{ custIds: number[]; flagId: number }` — translated server-side

## Response

RealGreen returns a plain `boolean`. Always `true` on a successful HTTP call, regardless of whether individual custIds were valid.

## Tested Behavior

| Scenario | RealGreen response | Actual effect |
|---|---|---|
| Single valid custId | `true` | Flag added to customer |
| Multiple valid custIds | `true` | Flag added to all customers |
| Single invalid custId (-1) | `true` | No-op — silently skipped |
| Mixed (invalid + valid) | `true` | Valid custId gets the flag; invalid silently skipped |
| Duplicate add (flag already on customer) | `true` | No-op — no duplicate created; idempotent |

## Implications

- The boolean response only confirms the HTTP call succeeded — it does **not** indicate which custIds were actually processed.
- Invalid custIds are silently skipped. The UI layer is responsible for only sending valid custIds.
- The operation is idempotent — safe to call multiple times for the same custId/flagId pair.
- No error is thrown for invalid custIds, so no special error handling is needed at the route level.

## State Update Strategy

Because `refreshCustomer` is heavyweight (fetches full customer + programs + services), we do **not** call it after a flag add. Instead, `addCustFlag.fulfilled` in `custFlagSlice` directly updates `flagIdCustIds` state:

- Reads `{ custIds, flagId }` from `action.payload`
- Adds all `custIds` to the `Set` for the given `flagId` entry
- Uses `Set` to prevent duplicates in state (matches RealGreen's idempotent behavior)
- No-ops if the `flagId` is not currently loaded in state

## Field Name Translation

All translation between RealGreen field names and app conventions happens in the route handler — one place to update if RealGreen changes their API shape:

| App convention | RealGreen field |
|---|---|
| `custIds` | `customerNumbers` |
| `flagId` | `flag` |

## Files

```
src/app/realGreen/custFlag/add/
  readme.addCustFlag.md          ← this file
  CustFlagAddContract.ts         ← contract: params { custIds, flagId }, result { custIds, flagId }
  api/
    route.ts                     ← translates app→RG, calls POST /Customer/Flags/Add, returns app-shaped payload

src/app/realGreen/custFlag/_lib/
  custFlagSlice.ts               ← addCustFlag thunk + fulfilled reducer (direct state update)

src/app/sandbox/flagAddTest/
  page.tsx                       ← test UI used during research (flag selector + 4 test buttons)
```
