import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { appMethodCapabilities } from "@/app/appMethod/appMethodCapabilities";
import { equipmentCapabilities } from "@/app/equipment/equipmentCapabilities";

// Products: what RealGreen sells (masters, subs and singles), and the settings this app keeps
// beside them (categories, units, which subs a master mixes, which equipment packages it uses, and
// how each product converts between units). Two routes own it: `product/api` and
// `product/unitConfig/api`.
//
// products.realGreen.read          -> product getAll (RealGreen list merged with the stored doc props)
// productCategories.write          -> product saveCategory
// productUnits.write               -> product saveUnit
// subProductConfigs.write          -> product saveMasterSubProducts
// masterEquipmentPackages.write    -> product saveMasterEquipmentPackages
// unitConversions.read             -> unitConfig getAll
// unitConversions.write            -> unitConfig saveConfig
//
// The product list is read only here (`source: "realGreen"`): this app never changes RealGreen's
// products. The four write resources are this app's own data, but each is only ever loaded merged
// into `getAll`, so they have no read of their own and each write lists the products read it needs
// (the same shape as `callAheadDocProps`). They are separate resources because they change
// different data. Renaming a category or a unit changes every product that uses it, and both can
// be changed back by saving the old name.
//
// requires: the product screens load and show application methods (a sub product's rate), the
// equipment packages a master points at and the equipment inside them, and the unit conversions.
// Those are other features' data (or this one's own) with their own capabilities. The own ones are
// written as strings because a declaration cannot reference its own `can`.
export const productCapabilities = createFeatureCapabilities({
  key: "product",
  resources: {
    products: { shape: "collection", source: "realGreen", verbs: ["read"] },
    productCategories: { shape: "collection", verbs: ["write"] },
    productUnits: { shape: "collection", verbs: ["write"] },
    subProductConfigs: { shape: "collection", verbs: ["write"] },
    masterEquipmentPackages: { shape: "collection", verbs: ["write"] },
    unitConversions: { shape: "collection", verbs: ["read", "write"] },
  },
  requires: {
    "products.read": [
      appMethodCapabilities.can.appMethods.read,
      equipmentCapabilities.can.equipmentDefinitions.read,
      equipmentCapabilities.can.equipmentPackages.read,
      "product.unitConversions.read",
    ],
    "productCategories.write": ["product.products.realGreen.read"],
    "productUnits.write": ["product.products.realGreen.read"],
    "subProductConfigs.write": ["product.products.realGreen.read"],
    "masterEquipmentPackages.write": [
      "product.products.realGreen.read",
      equipmentCapabilities.can.equipmentPackages.read,
    ],
    "unitConversions.write": ["product.products.realGreen.read"],
  },
});
