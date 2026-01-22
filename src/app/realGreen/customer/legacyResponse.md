# Legacy Response Structure

This document outlines the legacy response structure for the RealGreen Customer API.

## Types

*   **TParams**: `CustomerSearchCriteria | ProgramSearchCriteria | ServiceSearchCriteria`
*   **TResult**: `CustomerDoc | ServiceDoc | ProgramDoc`
*   **TNextParams**: `CustomerSearchCriteria | ProgramSearchCriteria | ServiceSearchCriteria`

## Response Object

The API returns a JSON object with the following structure:

```json
{
  "customers": [],
  "programs": [],
  "services": []
}
```

*   **customers**: Array of `CustomerDoc` objects.
*   **programs**: Array of `ProgramDoc` objects.
*   **services**: Array of `ServiceDoc` objects.

## State Shape

The Redux state shape mirrors the response object:

*   **State Shape:** `CustomerDoc`, `ProgramDoc`, `ServiceDoc`.
