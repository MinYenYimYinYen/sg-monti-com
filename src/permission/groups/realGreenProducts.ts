import { defineGroup } from "@/permission/defineGroup";

export const realGreenProductsGroup = defineGroup({
  key: "realGreenProducts",
  name: "Real Green Products",
  description: "Real Green Products and supporting models that extend them",
  resources: {
    // The product list lives in RealGreen and is read only here. The write resources below are
    // this app's own data, only ever loaded merged into the product list.
    products: { name: "Products", source: "realGreen", verbs: ["read"] },
    // Renaming a category or a unit changes every product that uses it. Both can be changed back.
    productCategories: { name: "Product categories", verbs: ["write"] },
    productUnits: { name: "Product units", verbs: ["write"] },
    subProductConfigs: { name: "Master product sub-products", verbs: ["write"] },
    unitConversions: { name: "Unit conversions", verbs: ["read", "write"] },
    appMethods: { name: "Application methods", verbs: ["read", "write", "delete"] },
  },
});
