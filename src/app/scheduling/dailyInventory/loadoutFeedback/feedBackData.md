

- `recentProduction` queries services by `servStats: ["completed"]` + `updated: dateRange` — it only returns finished jobs
- `selectScheduledServicesForTech` then filters `centralSelect.services` for matching assignments, but since only completed services are in the store, incomplete scheduled services are missing
- This means `scheduled` is under-counted, and `planned` amounts are calculated only from the services that were actually completed — making the "actual vs planned" comparison meaningless

**The fix:**

Add a new search scheme `servicesByAssignment` that queries services by `employeeId` + `schedDate` (assignment fields), regardless of completion status. This returns all services the employee was assigned to on that date — completed and not.

**Plan:**

1. **New search scheme** `servicesByAssignment` in `searchSchemes.ts`:
    - Step 1: `services` — query by `assignedEmployeeId` + `schedDate` (or however the service search criteria supports assignment filtering). Need to check `ServiceSearchCriteria` to confirm the field name.
    - Step 2: `programs` — batch by `progId`
    - Step 3: `customers` — batch by `custId`
    - `schemeParams`: `{ employeeId: string, schedDate: string }`

2. **New slice** `servicesByAssignmentSlice` in `customerSlices.ts` — same `createCustomerSlice` / `createGetCustDocsThunk` pattern

3. **`useLoadoutFeedbackDeps`** — replace `recentProductionActions.getDocs` with `servicesByAssignmentActions.getDocs`, passing `employeeId` and `routeDate` as `schemeParams`

4. **`feedbackSelect`** — update `selectScheduledServicesForTech` and `selectCompletedServicesForTech` to read from the new `servicesByAssignment` slice's state instead of `centralSelect.services` (which is the merged central store). Or alternatively, add a new selector that reads from the `servicesByAssignment` slice directly.

Before I finalize, I need to check `ServiceSearchCriteria` to confirm the field name for filtering by assignment employee + date. Can you confirm — does `ServiceSearchCriteria` support filtering by `assignedEmployeeId` and `schedDate`? Or do we need to add that to the search criteria and the API route?
