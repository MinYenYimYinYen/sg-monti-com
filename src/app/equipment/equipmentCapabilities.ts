import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { appMethodCapabilities } from "@/app/appMethod/appMethodCapabilities";

// Equipment (what a tech loads on a truck, and which application methods it can run) and equipment
// packages (named groups of equipment that products point at). Both have their own route.
//
// equipmentDefinitions.read   -> equipment getAll
// equipmentDefinitions.write  -> equipment upsert
// equipmentDefinitions.delete -> equipment deleteOne, checkDependencies
//
// equipmentPackages.read   -> equipmentPackage getAll
// equipmentPackages.write  -> equipmentPackage upsert
// equipmentPackages.delete -> equipmentPackage deleteOne, checkDependencies
//
// Both deleteOne ops can clear references: deleting equipment pulls it out of every package, and
// deleting a package pulls it out of every product master. Putting the item back does not restore
// those references. checkDependencies sits under delete (not read) because only the delete sheets
// call it.
//
// requires: the equipment form offers application methods, so reading equipment needs reading
// them. The package form offers equipment, so reading packages needs reading equipment. The package
// delete sheet also shows the product masters that point at the package, so deleting a package needs
// reading products (`realGreen/product`).
export const equipmentCapabilities = createFeatureCapabilities({
  key: "equipment",
  resources: {
    equipmentDefinitions: { shape: "collection", verbs: ["read", "write", "delete"] },
    equipmentPackages: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
  requires: {
    "equipmentDefinitions.read": [appMethodCapabilities.can.appMethods.read],
    "equipmentPackages.read": ["equipment.equipmentDefinitions.read"],
    // A string, not the `can` constant: the product declaration imports this one, so importing
    // back would be a cycle.
    "equipmentPackages.delete": ["product.products.realGreen.read"],
  },
});
