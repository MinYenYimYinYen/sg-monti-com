# ServCode Product Calculation & UI Strategy

## I. Data Architecture & Logic
To bridge the gap between a **Service Instance** and **Product Rules**, we use the property size as the primary multiplier.

### 1. The Core Calculation Formula
The quantity is derived by matching the service size against the rule threshold and applying the rate:

$$Quantity = Service.size \times ProductRule.applicationRate$$

### 2. Data Extraction Mapping
| Variable | Source | Purpose |
| :--- | :--- | :--- |
| `servCodeId` | `ServCode` | Primary grouping for the dashboard. |
| `targetSize` | `Service.size` | The "Area" variable (e.g., 5,000 sq ft). |
| `ruleMatch` | `productRules.sizeOperator` | Logic: `IF (targetSize >= threshold) THEN apply`. |
| `calculatedQty`| `Derived` | The result of (Size * Rate). |
| `aggregateTotal`| `Array.reduce()` | Sum of all `calculatedQty` for a specific `productMasterId`. |

---

## II. UI Implementation (shadcn/ui)

### 1. Inventory Impact Dashboard (The "Warehouse" View)
This view provides the aggregate data needed for loading trucks or ordering inventory.

* **Component:** `Table`
* **Key Columns:** * **Product:** `ProductMaster.name` (e.g., "High-Nitrogen 25-0-5")
    * **Total Needed:** `aggregateTotals` + `unitOfMeasure` (e.g., 450 Lbs)
    * **Context:** `Badge` indicating the `ProgCode` (e.g., "2026 Early Spring")
* **Visual Aid:** `Progress` bar showing `(Total Scheduled / Total Inventory)`.



### 2. Service Detail View (The "Route" View)
A drill-down to see exactly which customers are receiving which products.

* **Component:** `Accordion`
* **Trigger:** `ServCode.longName` (e.g., "Early Spring Fertilizer & Weed Control")
* **Content:** A nested `Table` or `ScrollArea`:
    * **Customer:** `Customer.displayName`
    * **Size:** `Service.size` (formatted with commas)
    * **Calculation:** `HoverCard` showing: `"Rule: Apply at 0.05lbs/sqft for properties > 2k sqft"`

---

## III. Recommended Layout Structure

### Top Level: Key Metrics (`Card`)
Use three cards to give an immediate snapshot of the work volume:
1.  **Total Services:** Count of active `servId`.
2.  **Total Area:** Sum of all `targetSize`.
3.  **Estimated Cost:** (Total Product * Unit Cost) if `productMaster` includes pricing.

### Main Section: Navigation (`Tabs`)
* **Tab A: "By Product":** Focuses on bulk weight/volume. Best for the warehouse manager.
* **Tab B: "By Service Code":** Focuses on the work types. Best for the route coordinator.

### Filters (`Input` & `Select`)
* **Search:** Filter by `Customer Name`.
* **Program Dropdown:** Filter by `ProgCode` to isolate specific seasonal rounds.

---

## IV. Logic Implementation Example (Pseudo-code)

```typescript
// Example of the Calculation Logic
const calculateProductNeeds = (services, productRules) => {
  return services.map(service => {
    const applicableRules = productRules.filter(rule => 
      evaluateOperator(service.size, rule.operator, rule.threshold)
    );

    return applicableRules.map(rule => ({
      productId: rule.productMasterId,
      qty: service.size * rule.applicationRate
    }));
  });
};