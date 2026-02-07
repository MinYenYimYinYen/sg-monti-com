# The "God Selector" Pattern (Single-Pass Graph Hydration)

## Concept
Instead of having separate selectors for each domain (Customer, ProgServ, Employee, etc.) that try to link to each other (causing circular dependencies), we create a single **Central Graph Selector**.

This selector acts as a "Fabric" that weaves all domain entities together into a single, fully navigable object graph.

## Mechanism
1.  **Input**: Takes "Raw" or "Base" data from all Redux slices (Customer, ProgServ, Employee, etc.).
2.  **Instantiation**: Creates the root objects for Reference Data (ServCodes, ProgCodes, Employees) first.
3.  **Hydration Loop**: Iterates through the Transactional Data (Customers -> Programs -> Services).
    *   Links Transactional objects to Reference objects (e.g., `Service.servCode = servCodeRef`).
    *   **Reverse Linking**: Pushes Transactional objects into Reference object arrays (e.g., `servCodeRef.services.push(service)`).
4.  **Output**: Returns a `Graph` object containing the entry points for all entities.

## Pros
*   **Full Navigability**: You can start at `Service`, go to `ServCode`, see all other `Services` for that code, go to their `Customers`, etc.
*   **Type Safety**: No `Omit` or partial types. Objects are fully formed.
*   **Performance**: Done in a single pass (O(n)). Memoized by Redux.

## Cons
*   **Monolithic**: As you add more domains (Employee, CallAhead, etc.), this file grows.
*   **Coupling**: The `centralSelectors.ts` file must import types from every module.
*   **Deprecation**: It effectively replaces individual module selectors for "Hydrated" access.

## Example Structure

```typescript
// centralSelectors.ts

export const selectCentralGraph = createSelector(
  [
    selectCustomerDocs,
    selectProgCodeDocs,
    selectServCodeDocs,
    selectEmployeeDocs, // Future
    // ... other inputs
  ],
  (customerDocs, progCodeDocs, servCodeDocs, employeeDocs) => {
    
    // 1. Prepare Reference Maps (Mutable for linking)
    const servCodeMap = new Map();
    servCodeDocs.forEach(doc => {
       const servCode = { ...doc, services: [] }; // Initialize empty
       servCodeMap.set(doc.id, servCode);
    });

    // 2. Build Transactional Graph
    const customers = customerDocs.map(custDoc => {
       const customer = { ...custDoc, programs: [] };
       
       // ... build programs ...
       
       const services = serviceDocs.map(servDoc => {
          const servCode = servCodeMap.get(servDoc.codeId);
          
          const service = { 
             ...servDoc, 
             servCode: servCode // Link Up
          };
          
          // Link Down (Reverse)
          if (servCode) {
             servCode.services.push(service);
          }
          
          return service;
       });
       
       return customer;
    });

    // 3. Return All Entry Points
    return {
       customers,
       servCodes: Array.from(servCodeMap.values()),
       // ...
    };
  }
);
```

## Scaling Concern
You mentioned 10+ other folders.
*   If we do this, `centralSelectors.ts` becomes the "Grand Central Station" of your app.
*   It is maintainable *if* you keep the logic inside the map loops simple (just linking).
*   If you start adding complex business logic *inside* the hydration loop, it will become unmanageable.
