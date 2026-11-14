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
    masterEquipmentPackages: { name: "Master product equipment packages", verbs: ["write"] },
    unitConversions: { name: "Unit conversions", verbs: ["read", "write"] },
    // Deleting an application method also removes it from product equipment packages and from
    // equipment, and putting the method back does not restore those references.
    appMethods: { name: "Application methods", verbs: ["read", "write", "delete"] },
    // Deleting equipment pulls it out of every package, and deleting a package pulls it out of
    // every product master. Putting the item back does not restore those references.
    equipmentDefinitions: { name: "Equipment", verbs: ["read", "write", "delete"] },
    equipmentPackages: { name: "Equipment packages", verbs: ["read", "write", "delete"] },
  },
});
