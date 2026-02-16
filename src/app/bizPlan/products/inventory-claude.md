# Product Inventory Analysis UI - Implementation Plan

## Executive Summary

This document outlines the implementation plan for a Product Inventory Analysis UI that allows users to analyze product usage based on customers, programs, and services loaded into Redux state. The data may span past seasons, current seasons, or both. This UI will serve multiple user personas: Product Managers (planning), Field Technicians (daily operations), and Accounting (budgeting/forecasting).

---

## Data Architecture Overview

### Current State Structure

**Entity Hierarchy:**
```
Customer (custId)
  -> Program[] (progId)
      -> Service[] (servId)
          -> production (actual products used - historical)
          -> productsPlanned (calculated via ProductRules)
```

**Key Type Definitions** (from `.output.txt`):

- **Customer**: Contains programs[], taxCodes, callAhead, discount
- **Program**: Contains services[], customer, progCode, season, price
- **Service**: Contains production, productsPlanned, servCode, size, season
- **ServCode**: Contains productRules[], progCode, longName
- **ProductRule**: Contains productMasters[], size threshold, sizeOperator
- **ProductMaster**: Contains subProductConfigs[] (actual inventory items)
- **SubProductConfig**: Contains subId, subProduct, rate
- **AppProduct**: The calculated product usage (productId, amount, size, productCommon)
- **DoneBy**: Employee attribution with percent field (1 = 100%, 0.5 = 50%, etc.)

### Product Calculation Logic

The system calculates planned product usage through a chain:

1. **Service** has a `size` (e.g., 5000 sq ft)
2. **Service** references a **ServCode** via `servCodeId`
3. **ServCode** contains **ProductRules** with size-based thresholds
4. **ProductRule** is evaluated: `if (service.size [operator] rule.size) then apply`
5. **ProductRule** references **ProductMasters**
6. **ProductMaster** contains **SubProductConfigs** (actual inventory items + rates)
7. **Calculation**: `quantity = service.size * subProductConfig.rate`

**Example:**
```typescript
Service: { size: 5000, servCodeId: "SPRING-FERT" }
ServCode: { servCodeId: "SPRING-FERT", productRules: [...] }
ProductRule: { sizeOperator: "gt", size: 2000, productMasters: [...] }
ProductMaster: { productId: 123, subProductConfigs: [...] }
SubProductConfig: { subId: 456, rate: 0.05 }
-> AppProduct: { productId: 456, amount: 250 (5000 * 0.05), size: 5000 }
```

### Employee Attribution Logic

When multiple employees work on a service, the `DoneBy.percent` field (decimal where 1 = 100%) determines attribution:

**Example:**
```typescript
Service: { size: 10000, production: { usedAppProducts: [{ amount: 100 }] } }
DoneBys: [
  { employeeId: "E1", percent: 0.6 }, // Employee 1: 60%
  { employeeId: "E2", percent: 0.4 }, // Employee 2: 40%
]

// Employee 1 attribution:
attributedAmount = 100 * 0.6 = 60 lbs
attributedSize = 10000 * 0.6 = 6000 sqft

// Employee 2 attribution:
attributedAmount = 100 * 0.4 = 40 lbs
attributedSize = 10000 * 0.4 = 4000 sqft
```

### Existing Selectors

**From `centralSelectors.ts` (line 165):**
```typescript
centralSelect = {
  context: selectActiveContexts,
  customers: selectCustomers,
  programs: selectPrograms,
  services: selectServices,
  customerMap: customerMap,
}
```

**From `progServSelectors.ts` (line 80):**
```typescript
progServSelect = {
  progCodeDocs: progServBaseSelect.progCodeDocs,
  progCodes: selectRichProgCodes, // Hydrated with programs
  servCodes: selectServCodes,     // Hydrated with services
}
```

**Key Hydration Functions:**
- `hydrateProduction()` -> converts ProductionCore to Production with usedAppProducts
- `hydrateProductsPlanned()` -> calculates AppProduct[] from service + productRules

---

## Phase 1: Selector Architecture

### Overview

We need to create a comprehensive set of selectors that aggregate product data in multiple dimensions to support different user personas and views. All selectors will be created in `src/app/bizPlan/products/selectors.ts`.

**Key Decisions:**
1. Season context is managed via data loading (useCustomerContext), not selector filtering
2. Use `Grouper.summarize()` for all aggregations (cleaner, more idiomatic)
3. Reuse and extend `AppProduct` type instead of creating separate types
4. Support employee attribution using `DoneBy.percent` field

### 1.1 Core Type Definitions

**Enriched AppProduct Type:**
```typescript
type EnrichedAppProduct = AppProduct & {
  servCode: ServCode;
  servCodeId: string;
  customer: Customer;
  program: Program;
  season: number;
  source?: 'actual' | 'planned'; // For mixed actual/planned selectors
}
```

**Product Usage Aggregation Types:**
```typescript
type ProductUsagePlanned = {
  productId: number;
  productCommon: ProductCommon;
  totalQuantity: number;
  unitOfMeasure: string;
  enrichedAppProducts: EnrichedAppProduct[];
}

type ProductUsageActual = {
  productId: number;
  productCommon: ProductCommon;
  totalQuantity: number;
  unitOfMeasure: string;
  productionDetails: Array<{
    servId: number;
    custId: number;
    progId: number;
    amount: number;
    production: Production;
    customer: Customer;
    program: Program;
    season: number;
  }>;
}
```

### 1.2 Product Usage (Planned) Aggregation Selector

**Purpose:** Aggregate all planned product usage across services using `Grouper.summarize()`

**Implementation:**
```typescript
const selectProductUsagePlanned = createSelector(
  [centralSelect.services],
  (services) => {
    // Step 1: Flatten and enrich all productsPlanned from all services
    const enrichedAppProducts: EnrichedAppProduct[] = services.flatMap(service =>
      service.productsPlanned.map(appProduct => ({
        ...appProduct, // Reuse existing AppProduct structure
        servId: service.servId,
        servCode: service.servCode,
        servCodeId: service.servCodeId,
        customer: service.program.customer,
        program: service.program,
        season: service.season,
        source: 'planned' as const,
      }))
    );

    // Step 2: Group by productId and summarize
    return new Grouper(enrichedAppProducts)
      .groupBy(ap => ap.productId)
      .summarize((productId, products) => {
        const firstProduct = products[0];

        return {
          productId,
          productCommon: firstProduct.productCommon,
          totalQuantity: products.reduce((sum, p) => sum + p.amount, 0),
          unitOfMeasure: firstProduct.productCommon.unit.description || '',
          enrichedAppProducts: products,
        };
      });
  }
)
```

### 1.3 Product Usage (Actual) Aggregation Selector

**Purpose:** Aggregate actual products used (historical production data)

**Implementation:**
```typescript
const selectProductUsageActual = createSelector(
  [centralSelect.services],
  (services) => {
    // Step 1: Flatten all usedAppProducts from productions
    const allUsedProducts = services
      .filter(service => service.production !== null)
      .flatMap(service =>
        service.production!.usedAppProducts.map(appProduct => ({
          ...appProduct,
          servId: service.servId,
          custId: service.program.customer.custId,
          progId: service.program.progId,
          production: service.production!,
          customer: service.program.customer,
          program: service.program,
          season: service.season,
        }))
      );

    // Step 2: Group by productId and summarize
    return new Grouper(allUsedProducts)
      .groupBy(ap => ap.productId)
      .summarize((productId, products) => {
        const firstProduct = products[0];

        return {
          productId,
          productCommon: firstProduct.productCommon,
          totalQuantity: products.reduce((sum, p) => sum + p.amount, 0),
          unitOfMeasure: firstProduct.productCommon.unit.description || '',
          productionDetails: products.map(p => ({
            servId: p.servId,
            custId: p.custId,
            progId: p.progId,
            amount: p.amount,
            production: p.production,
            customer: p.customer,
            program: p.program,
            season: p.season,
          })),
        };
      });
  }
)
```

### 1.4 Products Grouped by Service Code

**Purpose:** Group products by ServCode for route planning view

**Output Shape:**
```typescript
type ProductsByServCode = {
  servCodeId: string;
  servCode: ServCode;
  totalServices: number;
  totalArea: number;
  products: ProductUsagePlanned[];
}
```

**Implementation:**
```typescript
const selectProductsByServCode = createSelector(
  [selectProductUsagePlanned, centralSelect.services],
  (productsPlanned, services) => {
    // Group services by servCodeId for area calculations
    const servicesByServCode = new Grouper(services)
      .groupBy(s => s.servCodeId)
      .toMap();

    // Group products by servCodeId
    const productsByServCode = new Map<string, ProductUsagePlanned[]>();

    productsPlanned.forEach(product => {
      product.enrichedAppProducts.forEach(enriched => {
        if (!productsByServCode.has(enriched.servCodeId)) {
          productsByServCode.set(enriched.servCodeId, []);
        }

        const existingProducts = productsByServCode.get(enriched.servCodeId)!;
        const existingProduct = existingProducts.find(p => p.productId === product.productId);

        if (!existingProduct) {
          // Add product with only relevant enriched products for this servCode
          existingProducts.push({
            ...product,
            enrichedAppProducts: product.enrichedAppProducts.filter(
              e => e.servCodeId === enriched.servCodeId
            ),
            totalQuantity: product.enrichedAppProducts
              .filter(e => e.servCodeId === enriched.servCodeId)
              .reduce((sum, e) => sum + e.amount, 0),
          });
        }
      });
    });

    // Summarize by servCodeId
    return Array.from(productsByServCode.entries()).map(([servCodeId, products]) => {
      const services = servicesByServCode.get(servCodeId) || [];
      const totalArea = services.reduce((sum, s) => sum + s.size, 0);
      const firstService = services[0];

      return {
        servCodeId,
        servCode: firstService?.servCode || baseServCode,
        totalServices: services.length,
        totalArea,
        products,
      };
    });
  }
)
```

### 1.5 Products Grouped by Customer

**Purpose:** View product usage per customer

**Output Shape:**
```typescript
type ProductsByCustomer = {
  custId: number;
  customer: Customer;
  products: Array<{
    productId: number;
    productCommon: ProductCommon;
    totalQuantity: number;
    unitOfMeasure: string;
    services: Array<{
      servId: number;
      amount: number;
      size: number;
      servCodeId: string;
      progId: number;
    }>;
  }>;
  totalServices: number;
  totalArea: number;
}
```

**Implementation:**
```typescript
const selectProductsByCustomer = createSelector(
  [selectProductUsagePlanned, centralSelect.customerMap],
  (productsPlanned, customerMap) => {
    // Group products by customer
    const productsByCustomer = new Map<number, ProductUsagePlanned[]>();

    productsPlanned.forEach(product => {
      product.enrichedAppProducts.forEach(enriched => {
        const custId = enriched.customer.custId;

        if (!productsByCustomer.has(custId)) {
          productsByCustomer.set(custId, []);
        }

        const existingProducts = productsByCustomer.get(custId)!;
        const existingProduct = existingProducts.find(p => p.productId === product.productId);

        if (!existingProduct) {
          existingProducts.push({
            ...product,
            enrichedAppProducts: product.enrichedAppProducts.filter(
              e => e.customer.custId === custId
            ),
            totalQuantity: product.enrichedAppProducts
              .filter(e => e.customer.custId === custId)
              .reduce((sum, e) => sum + e.amount, 0),
          });
        }
      });
    });

    // Summarize by customer
    return Array.from(productsByCustomer.entries()).map(([custId, products]) => {
      const customer = customerMap.get(custId);
      const allEnrichedProducts = products.flatMap(p => p.enrichedAppProducts);
      const totalArea = allEnrichedProducts.reduce((sum, e) => sum + e.size, 0);

      return {
        custId,
        customer: customer!,
        products: products.map(p => ({
          productId: p.productId,
          productCommon: p.productCommon,
          totalQuantity: p.totalQuantity,
          unitOfMeasure: p.unitOfMeasure,
          services: p.enrichedAppProducts.map(e => ({
            servId: e.servId,
            amount: e.amount,
            size: e.size,
            servCodeId: e.servCodeId,
            progId: e.program.progId,
          })),
        })),
        totalServices: new Set(allEnrichedProducts.map(e => e.servId)).size,
        totalArea,
      };
    });
  }
)
```

### 1.6 Products Grouped by Program Code

**Purpose:** View product usage by seasonal program

**Output Shape:**
```typescript
type ProductsByProgCode = {
  progCodeId: string;
  progCode: ProgCode;
  season: number;
  products: ProductUsagePlanned[];
  totalServices: number;
  totalPrograms: number;
  totalArea: number;
}
```

**Implementation:**
```typescript
const selectProductsByProgCode = createSelector(
  [selectProductUsagePlanned, progServSelect.progCodes],
  (productsPlanned, progCodes) => {
    const progCodeMap = new Grouper(progCodes).toUniqueMap(pc => pc.progCodeId);
    const productsByProgCode = new Map<string, ProductUsagePlanned[]>();

    productsPlanned.forEach(product => {
      product.enrichedAppProducts.forEach(enriched => {
        const progCodeId = enriched.program.progCode.progCodeId;

        if (!productsByProgCode.has(progCodeId)) {
          productsByProgCode.set(progCodeId, []);
        }

        const existingProducts = productsByProgCode.get(progCodeId)!;
        const existingProduct = existingProducts.find(p => p.productId === product.productId);

        if (!existingProduct) {
          existingProducts.push({
            ...product,
            enrichedAppProducts: product.enrichedAppProducts.filter(
              e => e.program.progCode.progCodeId === progCodeId
            ),
            totalQuantity: product.enrichedAppProducts
              .filter(e => e.program.progCode.progCodeId === progCodeId)
              .reduce((sum, e) => sum + e.amount, 0),
          });
        }
      });
    });

    // Summarize by progCode
    return Array.from(productsByProgCode.entries()).map(([progCodeId, products]) => {
      const progCode = progCodeMap.get(progCodeId);
      const allEnrichedProducts = products.flatMap(p => p.enrichedAppProducts);
      const totalArea = allEnrichedProducts.reduce((sum, e) => sum + e.size, 0);
      const uniquePrograms = new Set(allEnrichedProducts.map(e => e.program.progId)).size;

      return {
        progCodeId,
        progCode: progCode!,
        season: allEnrichedProducts[0]?.season || 0,
        products,
        totalServices: new Set(allEnrichedProducts.map(e => e.servId)).size,
        totalPrograms: uniquePrograms,
        totalArea,
      };
    });
  }
)
```

### 1.7 Products Grouped by Employee (NEW)

**Purpose:** View product usage per employee with percent attribution

**Key Concept - Double Grouping Pattern:**
When grouping products by employee, we need to perform **two levels of grouping**:

1. **First grouping**: By employeeId - groups all work done by each employee
2. **Second grouping**: By productId within each employee - groups multiple uses of the same product

**Why this matters:**
```typescript
// Example: Employee "E1" worked on 3 services
Service 1: E1 used 60 lbs of "Fertilizer A" (productId: 123)
Service 2: E1 used 30 lbs of "Fertilizer A" (productId: 123)  // Same product!
Service 3: E1 used 20 lbs of "Weed Control B" (productId: 456) // Different product

// We want to show:
Employee E1:
  - Fertilizer A: 90 lbs total (60 + 30)
  - Weed Control B: 20 lbs total
```

The variable naming reflects this pattern:
- `allEmployeeWork` = all services worked by all employees (flat)
- `workByOneEmployee` = all services worked by ONE specific employee
- `usesOfThisProduct` = all times ONE employee used ONE specific product

**Output Shape:**
```typescript
type ProductsByEmployee = {
  employeeId: string;
  employee: Employee;
  products: Array<{
    productId: number;
    productCommon: ProductCommon;
    totalQuantity: number; // Sum of (amount * percent)
    unitOfMeasure: string;
    productions: Array<{
      servId: number;
      custId: number;
      amount: number;           // Original total amount
      attributedAmount: number; // amount * doneBy.percent
      percent: number;          // Employee's contribution (1 = 100%)
      size: number;             // Original service size
      attributedSize: number;   // size * doneBy.percent
      production: Production;
      customer: Customer;
    }>;
  }>;
  totalProductions: number;
  totalAttributedArea: number; // Sum of attributed sizes
}
```

**Implementation:**
```typescript
const selectProductsByEmployee = createSelector(
  [selectProductUsageActual],
  (productsActual) => {
    // Step 1: Flatten to employee-product pairs with percent attribution
    // This creates one entry for each (employee, service, product) combination
    const allEmployeeWork = productsActual.flatMap(product =>
      product.productionDetails.flatMap(pd =>
        pd.production.doneBys.map(doneBy => ({
          employeeId: doneBy.employeeId,
          employee: doneBy.employee,
          percent: doneBy.percent, // Decimal: 1 = 100%, 0.5 = 50%
          productId: product.productId,
          productCommon: product.productCommon,
          amount: pd.amount,
          attributedAmount: pd.amount * doneBy.percent, // KEY: Apply percent
          size: pd.production.size || 0,
          attributedSize: (pd.production.size || 0) * doneBy.percent, // KEY: Apply percent
          servId: pd.servId,
          custId: pd.custId,
          production: pd.production,
          customer: pd.customer,
        }))
      )
    );

    // Step 2: First grouping - by employeeId
    // Groups all work done by each employee
    return new Grouper(allEmployeeWork)
      .groupBy(work => work.employeeId)
      .summarize((employeeId, workByOneEmployee) => {
        // workByOneEmployee = all services this one employee worked on
        const firstWork = workByOneEmployee[0];

        // Step 3: Second grouping - by productId within this employee
        // Groups multiple uses of the same product by this employee
        const productGroups = new Grouper(workByOneEmployee)
          .groupBy(work => work.productId)
          .summarize((productId, usesOfThisProduct) => {
            // usesOfThisProduct = all times this employee used this specific product
            // Example: [
            //   { servId: 1, attributedAmount: 60 },
            //   { servId: 2, attributedAmount: 30 },
            // ]

            return {
              productId,
              productCommon: usesOfThisProduct[0].productCommon,
              totalQuantity: usesOfThisProduct.reduce(
                (sum, use) => sum + use.attributedAmount, // Sum attributed amounts
                0
              ),
              unitOfMeasure: usesOfThisProduct[0].productCommon.unit.description || '',
              productions: usesOfThisProduct.map(use => ({
                servId: use.servId,
                custId: use.custId,
                amount: use.amount,
                attributedAmount: use.attributedAmount,
                percent: use.percent,
                size: use.size,
                attributedSize: use.attributedSize,
                production: use.production,
                customer: use.customer,
              })),
            };
          });

        return {
          employeeId,
          employee: firstWork.employee,
          products: productGroups,
          totalProductions: new Set(workByOneEmployee.map(w => w.servId)).size,
          totalAttributedArea: workByOneEmployee.reduce(
            (sum, w) => sum + w.attributedSize,
            0
          ),
        };
      });
  }
)
```

**Attribution Example:**
```typescript
// Service with 10,000 sqft, used 100 lbs of Product A
// Two employees worked on it:
service = {
  size: 10000,
  production: {
    usedAppProducts: [{ productId: 123, amount: 100 }],
    doneBys: [
      { employeeId: "E1", percent: 0.6 }, // 60%
      { employeeId: "E2", percent: 0.4 }, // 40%
    ]
  }
}

// Result for Employee E1:
{
  employeeId: "E1",
  products: [{
    productId: 123,
    totalQuantity: 60, // 100 * 0.6
    productions: [{
      amount: 100,              // Original
      attributedAmount: 60,     // 100 * 0.6
      percent: 0.6,
      size: 10000,              // Original
      attributedSize: 6000,     // 10000 * 0.6
    }]
  }],
  totalAttributedArea: 6000
}
```

### 1.8 Summary Statistics Selector

**Purpose:** Top-level metrics for dashboard

**Output Shape:**
```typescript
type SummaryStats = {
  totalServices: number;
  totalArea: number;
  totalProducts: number;
  totalQuantity: number;
}
```

**Implementation:**
```typescript
const selectSummaryStats = createSelector(
  [centralSelect.services, selectProductUsagePlanned],
  (services, productsPlanned) => {
    const totalArea = services.reduce((sum, s) => sum + s.size, 0);
    const totalQuantity = productsPlanned.reduce((sum, p) => sum + p.totalQuantity, 0);

    return {
      totalServices: services.length,
      totalArea,
      totalProducts: productsPlanned.length,
      totalQuantity,
    };
  }
)
```

### 1.9 Mixed Actual/Planned Products Selector (NEW - Phase 1)

**Purpose:** Combine actual (completed) and planned (remaining) products for current season analysis

**Key Concept:** Use actual production data for completed services (status === "S"), use planned data for remaining services.

**Output Shape:**
```typescript
type ProductUsageMixed = {
  productId: number;
  productCommon: ProductCommon;
  totalQuantity: number;
  unitOfMeasure: string;
  actual: { quantity: number; services: number };
  planned: { quantity: number; services: number };
  mixedProducts: EnrichedAppProduct[]; // Tagged with source: 'actual' | 'planned'
}
```

**Implementation:**
```typescript
const selectProductsMixedActualPlanned = createSelector(
  [centralSelect.services],
  (services) => {
    // Step 1: Flatten all products, choosing actual or planned based on status
    const mixedProducts: EnrichedAppProduct[] = services.flatMap(service => {
      const isComplete = service.status === "S";
      const products = isComplete
        ? service.production?.usedAppProducts || []
        : service.productsPlanned;

      return products.map(p => ({
        ...p,
        servId: service.servId,
        servCode: service.servCode,
        servCodeId: service.servCodeId,
        customer: service.program.customer,
        program: service.program,
        season: service.season,
        source: isComplete ? 'actual' as const : 'planned' as const,
      }));
    });

    // Step 2: Group by productId and summarize
    return new Grouper(mixedProducts)
      .groupBy(p => p.productId)
      .summarize((productId, products) => {
        const firstProduct = products[0];
        const actualProducts = products.filter(p => p.source === 'actual');
        const plannedProducts = products.filter(p => p.source === 'planned');

        return {
          productId,
          productCommon: firstProduct.productCommon,
          totalQuantity: products.reduce((sum, p) => sum + p.amount, 0),
          unitOfMeasure: firstProduct.productCommon.unit.description || '',
          actual: {
            quantity: actualProducts.reduce((sum, p) => sum + p.amount, 0),
            services: new Set(actualProducts.map(p => p.servId)).size,
          },
          planned: {
            quantity: plannedProducts.reduce((sum, p) => sum + p.amount, 0),
            services: new Set(plannedProducts.map(p => p.servId)).size,
          },
          mixedProducts: products,
        };
      });
  }
)
```

### 1.10 LY vs TY Comparison Selector

**Purpose:** Side-by-side comparison of last year vs this year

**Note:** This selector works with whatever seasons are loaded into state. If multiple seasons are loaded, it compares based on globalSettings.season.

**Output Shape:**
```typescript
type ProductComparison = {
  productId: number;
  productCommon: ProductCommon;
  lastYear: {
    quantity: number;
    services: number;
  };
  thisYear: {
    quantity: number;
    services: number;
  };
  variance: {
    quantityDiff: number;
    quantityPercent: number;
    serviceDiff: number;
  };
}
```

**Implementation:**
```typescript
const selectProductComparison = createSelector(
  [centralSelect.services, globalSettingsSelect.season],
  (allServices, currentSeason) => {
    const lyServices = allServices.filter(s => s.season === currentSeason - 1);
    const tyServices = allServices.filter(s => s.season === currentSeason);

    // Build usage maps for LY and TY
    const buildUsageMap = (services: Service[]) => {
      const map = new Map<number, { quantity: number; serviceCount: number }>();
      services.forEach(service => {
        service.productsPlanned.forEach(appProduct => {
          const existing = map.get(appProduct.productId) || { quantity: 0, serviceCount: 0 };
          map.set(appProduct.productId, {
            quantity: existing.quantity + appProduct.amount,
            serviceCount: existing.serviceCount + 1,
          });
        });
      });
      return map;
    };

    const lyUsage = buildUsageMap(lyServices);
    const tyUsage = buildUsageMap(tyServices);

    // Get all unique productIds
    const allProductIds = new Set([...lyUsage.keys(), ...tyUsage.keys()]);

    return Array.from(allProductIds).map(productId => {
      const ly = lyUsage.get(productId) || { quantity: 0, serviceCount: 0 };
      const ty = tyUsage.get(productId) || { quantity: 0, serviceCount: 0 };

      const quantityDiff = ty.quantity - ly.quantity;
      const quantityPercent = ly.quantity > 0 ? (quantityDiff / ly.quantity) * 100 : 0;
      const serviceDiff = ty.serviceCount - ly.serviceCount;

      // Get productCommon from first available service
      const firstService = [...lyServices, ...tyServices].find(s =>
        s.productsPlanned.some(ap => ap.productId === productId)
      );
      const productCommon = firstService?.productsPlanned.find(
        ap => ap.productId === productId
      )?.productCommon;

      return {
        productId,
        productCommon: productCommon!,
        lastYear: { quantity: ly.quantity, services: ly.serviceCount },
        thisYear: { quantity: ty.quantity, services: ty.serviceCount },
        variance: { quantityDiff, quantityPercent, serviceDiff },
      };
    }).filter(p => p.productCommon); // Filter out any missing productCommon
  }
)
```

### 1.11 Export All Selectors

```typescript
export const inventorySelectors = {
  // Core aggregations
  productUsagePlanned: selectProductUsagePlanned,
  productUsageActual: selectProductUsageActual,
  productsMixedActualPlanned: selectProductsMixedActualPlanned,

  // Grouped views
  productsByServCode: selectProductsByServCode,
  productsByCustomer: selectProductsByCustomer,
  productsByProgCode: selectProductsByProgCode,
  productsByEmployee: selectProductsByEmployee,

  // Summary & comparison
  summaryStats: selectSummaryStats,
  productComparison: selectProductComparison,
}
```

---

## Phase 2: UI/UX Strategy

### 2.1 User Personas & Requirements

#### Product Manager (Planning)
**Goals:**
- Forecast inventory needs for upcoming season
- Compare year-over-year product usage trends
- Budget for product purchases
- Identify underutilized or overused products

**Key Views:**
- Bulk quantities aggregated by product
- Season-over-season comparisons
- Cost forecasting and budget impact

**Primary Tab:** "By Product"

#### Field Technician (Daily Operations)
**Goals:**
- Plan daily route loadouts
- Know which products to bring for each service
- Understand customer-specific requirements
- Quick reference for service details

**Key Views:**
- Route-based product lists (by ServCode)
- Customer details with service sizes
- Drill-down by location/customer

**Primary Tab:** "By Service Code"

#### Accounting (Budgeting/Forecasting)
**Goals:**
- Track cost of goods sold
- Program-level cost analysis
- Variance analysis (budget vs actual)
- Seasonal financial trends

**Key Views:**
- Financial summaries
- Seasonal comparisons with cost data
- Program-level aggregations

**Primary Tab:** "LY vs TY Comparison"

### 2.2 Page Layout Architecture

**File Location:** `src/app/bizPlan/products/page.tsx`

```
+------------------------------------------------------------+
|                    Page Header                             |
|  "Product Inventory Analysis" + Season Indicator           |
+------------------------------------------------------------+

+------------------------------------------------------------+
|              Key Metrics Cards (Grid: 3 cols)              |
|  +----------+  +----------+  +----------+                  |
|  |  Total   |  |  Total   |  | Estimated|                  |
|  | Services |  |   Area   |  |   Cost   |                  |
|  |   1,234  |  | 5.2M sqft|  | $45,000  |                  |
|  +----------+  +----------+  +----------+                  |
+------------------------------------------------------------+

+------------------------------------------------------------+
|                  Filter Controls Bar                       |
|  [Search...]  [Season v]  [Program v]  [Service v]        |
+------------------------------------------------------------+

+------------------------------------------------------------+
|                    Tabs Navigation                         |
|  [By Product] [By Service Code] [By Customer] [By Employee] [LY vs TY]
+------------------------------------------------------------+
|                                                            |
|                  Tab Content Area                          |
|           (Tables/Accordions/Comparisons)                  |
|                                                            |
+------------------------------------------------------------+
```

### 2.3 Component Specifications

#### Header Section
```tsx
<div className="mb-6">
  <h1 className="text-3xl font-bold">Product Inventory Analysis</h1>
  <p className="text-muted-foreground">
    Season {currentSeason} - {totalServices} services loaded
  </p>
</div>
```

#### Key Metrics Cards
```tsx
<div className="grid gap-4 md:grid-cols-3 mb-6">
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">Total Services</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{summaryStats.totalServices}</div>
      <p className="text-xs text-muted-foreground">Across all programs</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">Total Area</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {formatNumber(summaryStats.totalArea)} sqft
      </div>
      <p className="text-xs text-muted-foreground">Service coverage</p>
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">Total Products</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {summaryStats.totalProducts}
      </div>
      <p className="text-xs text-muted-foreground">Unique products used</p>
    </CardContent>
  </Card>
</div>
```

#### Filter Controls Bar
```tsx
<div className="flex gap-4 mb-6">
  <Input
    placeholder="Search customers, products..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="max-w-sm"
  />

  <Select value={progCodeFilter} onValueChange={setProgCodeFilter}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="All programs" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Programs</SelectItem>
      {progCodes.map(pc => (
        <SelectItem key={pc.progCodeId} value={pc.progCodeId}>
          {pc.description}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  <Select value={servCodeFilter} onValueChange={setServCodeFilter}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="All services" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Service Codes</SelectItem>
      {servCodes.map(sc => (
        <SelectItem key={sc.servCodeId} value={sc.servCodeId}>
          {sc.longName}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 2.4 Tab Specifications Summary

**Tab 1: "By Product"** - DataTable with expandable rows showing service breakdown

**Tab 2: "By Service Code"** - Accordion with product cards for route planning

**Tab 3: "By Customer"** - DataTable with nested product lists

**Tab 4: "By Employee"** - DataTable showing attributed product usage per employee

**Tab 5: "LY vs TY"** - Comparison table with variance indicators

(Detailed tab implementations follow same patterns as before - using enrichedAppProducts instead of serviceDetails)

---

## Implementation Sequence

### Sprint 1: Foundation (Selectors)
1. Define `EnrichedAppProduct` and aggregation types
2. Create `selectProductUsagePlanned` using `Grouper.summarize()`
3. Create `selectProductUsageActual` using `Grouper.summarize()`
4. Create `selectSummaryStats`
5. Test with console.log in existing page

### Sprint 2: Grouping Selectors
1. Create `selectProductsByServCode` using `Grouper.summarize()`
2. Create `selectProductsByCustomer` using `Grouper.summarize()`
3. Create `selectProductsByProgCode` using `Grouper.summarize()`
4. Create `selectProductsByEmployee` with double-grouping pattern
5. Create `selectProductsMixedActualPlanned`
6. Export all via `inventorySelectors`

### Sprint 3: Comparison Selector
1. Create `selectProductComparison`
2. Test all selectors with various season combinations
3. Validate employee attribution calculations

### Sprint 4: UI Shell
1. Create page layout with header
2. Add key metrics cards (wired to `selectSummaryStats`)
3. Add filter controls bar (state management)
4. Add Tabs component (5 tabs)

### Sprint 5: Tab 1 - By Product
1. Create DataTable component
2. Define columns with sorting
3. Implement expandable rows
4. Wire to `selectProductUsagePlanned`
5. Apply search/filter logic

### Sprint 6: Tab 2 - By Service Code
1. Create Accordion structure
2. Build product cards with tables
3. Add HoverCard for calculation details
4. Wire to `selectProductsByServCode`

### Sprint 7: Tabs 3 & 4 - Customer and Employee
1. Implement "By Customer" tab
2. Implement "By Employee" tab with attribution display
3. Show both original and attributed amounts
4. Add percent indicators

### Sprint 8: Tab 5 - LY vs TY
1. Implement comparison table
2. Add variance indicators and styling
3. Wire to `selectProductComparison`

### Sprint 9: Polish & Refinement
1. Add loading states
2. Add empty states
3. Improve responsive design
4. Add keyboard navigation
5. Performance optimization (virtualization if needed)
6. User testing with each persona

---

## Technical Decisions & Considerations

### State Management
- Season data loaded via `useCustomerContext` hooks before page renders
- Filters stored in component state (useState)
- Could be lifted to URL params for sharing/bookmarking

### Performance
- Selectors are memoized via createSelector
- Use `Grouper.summarize()` for efficient aggregations
- Consider virtualization for large datasets (react-window)
- Debounce search input (300ms)

### Data Freshness
- All data comes from Redux state
- Assumes data is loaded via existing mechanisms
- No API calls from this page

### Error Handling
- Handle missing productCommon gracefully
- Show empty states when no data matches filters
- Validate percent attribution totals (should sum to ~1.0 per service)

### Accessibility
- Proper ARIA labels on interactive elements
- Keyboard navigation for tables and accordions
- Screen reader announcements for dynamic updates

### Future Enhancements (Phase 2+)
- **Time-based grouping**: Weekly, monthly, yearly using ServCode.dateRange
- **Rate-based forecasting**: Use actual production rates to improve planned forecasts
- **Week number calculation**: Implement client-specific week 1 determination
- Export to CSV/Excel
- Print-friendly views
- Save filter presets
- Inventory tracking integration (if onHand data available)
- Cost data integration (if product cost available)
- Map view for customer locations

---

## Appendix: Type Definitions

### Key Types Reference

```typescript
// From existing codebase
Customer: { custId, programs[], displayName, formattedAddress, ... }
Program: { progId, services[], customer, progCode, season, price, ... }
Service: { servId, size, season, servCode, production, productsPlanned, program, status, ... }
ServCode: { servCodeId, longName, productRules[], progCode, services[], dateRange, ... }
ProgCode: { progCodeId, description, servCodes[], programs[], ... }
ProductRule: { size, sizeOperator, productMasters[] }
ProductMaster: { productId, subProductConfigs[], ... }
SubProductConfig: { subId, subProduct, rate }
AppProduct: { productId, amount, size, servId, productCommon }
ProductCommon: { productId, description, productCode, unit, category, ... }
DoneBy: { doneById, employeeId, servId, percent, employee }
Employee: { employeeId, ... } // Now hydrated in central selector

// New types for this feature
EnrichedAppProduct: AppProduct & { servCode, customer, program, season, source? }
ProductUsagePlanned: { productId, productCommon, totalQuantity, unitOfMeasure, enrichedAppProducts[] }
ProductUsageActual: { productId, productCommon, totalQuantity, unitOfMeasure, productionDetails[] }
ProductUsageMixed: { productId, productCommon, totalQuantity, actual, planned, mixedProducts[] }
ProductsByServCode: { servCodeId, servCode, totalServices, totalArea, products[] }
ProductsByCustomer: { custId, customer, products[], totalServices, totalArea }
ProductsByProgCode: { progCodeId, progCode, season, products[], totalServices, totalPrograms, totalArea }
ProductsByEmployee: { employeeId, employee, products[], totalProductions, totalAttributedArea }
ProductComparison: { productId, productCommon, lastYear, thisYear, variance }
SummaryStats: { totalServices, totalArea, totalProducts, totalQuantity }
```

---

## Notes for Future Implementation Session

1. **Start with Phase 1** - Get selectors working and tested via console.log before building UI
2. **Use `Grouper.summarize()`** throughout for cleaner, more idiomatic code
3. **Reuse `AppProduct` type** with enrichment pattern for consistency
4. **Check `productsPlanned` population** - currently gated by `servId === 5962033` (line 15 of hydrateProductsPlanned.ts) - this will need to be removed
5. **Employee attribution** - Always use `amount * percent` and `size * percent` for employee metrics
6. **Update DoneByCore.ts:36** - Update TODO comment to confirm percent interpretation (1 = 100%)
7. **Double-grouping pattern** - First by employee, then by product within employee for clear aggregation
8. **Mixed actual/planned** - Use `service.status === "S"` to determine which data source to use
9. **Empty state handling** - Many services may have empty productsPlanned if ProductRules not configured
10. **Data validation** - Add null checks and fallbacks throughout
11. **Styling consistency** - Match existing app theme and component patterns

---

**Document Version:** 2.0
**Last Updated:** 2026-02-16
**Status:** Planning Complete - Ready for Implementation
