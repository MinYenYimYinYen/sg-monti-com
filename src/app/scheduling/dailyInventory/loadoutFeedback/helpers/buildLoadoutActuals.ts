import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { LoadoutActuals, LoadoutFinal } from "@/app/loadout/LoadoutTypes";

type EquipmentMasterDef = LoadoutFinal["masters"][number];
type OtherMasterDef = LoadoutFinal["masters"][number];

/** Returns the set of non-water constituent productIds for a master's first equipment. */
function constituentProductIdsForMaster(master: EquipmentMasterDef): Set<number> {
  return new Set(master.equipments[0].constituents.slice(1).map((c) => c.product.productId));
}

/** Initializes empty matched-service arrays for all equipment masters and other master sub-products. */
function initMatchArrays(
  equipmentMasterDefs: EquipmentMasterDef[],
  otherMasterDefs: OtherMasterDef[],
): { equipmentMatchedServices: Service[][]; otherSubMatchedServices: Service[][][] } {
  return {
    equipmentMatchedServices: equipmentMasterDefs.map(() => []),
    otherSubMatchedServices: otherMasterDefs.map((master) => master.subProducts.map(() => [])),
  };
}

/**
 * Attempts to match a service to each equipment master.
 * A match requires the service's usedAppProducts to be a superset of the master's
 * non-water constituent productIds (prevents double-counting across masters).
 * Returns true if at least one match was found.
 */
function matchServiceToEquipmentMasters(
  serviceProductIds: Set<number>,
  equipmentConstituentSets: Set<number>[],
  equipmentMatchedServices: Service[][],
  service: Service,
): boolean {
  let matched = false;
  for (let i = 0; i < equipmentConstituentSets.length; i++) {
    const constituentIds = equipmentConstituentSets[i];
    if (constituentIds.size === 0) continue;
    if ([...constituentIds].every((id) => serviceProductIds.has(id))) {
      equipmentMatchedServices[i].push(service);
      matched = true;
    }
  }
  return matched;
}

/**
 * Attempts to match a service to each sub-product of each other master.
 * Matching is independent of equipment master matching — a service may match both.
 * Returns true if at least one match was found.
 */
function matchServiceToOtherMasters(
  serviceProductIds: Set<number>,
  otherMasterDefs: OtherMasterDef[],
  otherSubMatchedServices: Service[][][],
  service: Service,
): boolean {
  let matched = false;
  for (let i = 0; i < otherMasterDefs.length; i++) {
    const master = otherMasterDefs[i];
    for (let j = 0; j < master.subProducts.length; j++) {
      if (serviceProductIds.has(master.subProducts[j].productId)) {
        otherSubMatchedServices[i][j].push(service);
        matched = true;
      }
    }
  }
  return matched;
}

/** Assembles the final LoadoutActuals tree from matched service arrays. */
function buildActualsResult(
  equipmentMasterDefs: EquipmentMasterDef[],
  otherMasterDefs: OtherMasterDef[],
  equipmentMatchedServices: Service[][],
  otherSubMatchedServices: Service[][][],
  unmatchedServices: Service[],
): LoadoutActuals {
  return {
    equipmentMasters: equipmentMasterDefs.map((master, i) => ({
      ...master,
      subProducts: master.subProducts,
      matchedServices: equipmentMatchedServices[i],
    })),
    otherMasters: otherMasterDefs.map((master, i) => ({
      ...master,
      subProducts: master.subProducts.map((sub, j) => ({
        ...sub,
        matchedServices: otherSubMatchedServices[i][j],
      })),
    })),
    unmatchedServices,
  };
}

/**
 * Matches completed services to their corresponding loadout entries by productId,
 * returning a LoadoutActuals tree with Service objects attached to each entry.
 *
 * Equipment masters: a service matches when its usedAppProducts is a superset of
 * the master's non-water constituent productIds (prevents double-counting when a
 * product appears in multiple masters).
 *
 * Other masters (no equipment): each sub-product's services are matched when
 * usedAppProducts contains that sub-product's productId.
 *
 * Services that don't match any loadout entry are collected in unmatchedServices.
 */
export function buildLoadoutActuals(
  completed: Service[],
  loadout: LoadoutFinal,
): LoadoutActuals {
  const equipmentMasterDefs = loadout.masters.filter((m) => m.equipments.length > 0);
  const otherMasterDefs = loadout.masters.filter((m) => m.equipments.length === 0);
  const equipmentConstituentSets = equipmentMasterDefs.map(constituentProductIdsForMaster);
  const { equipmentMatchedServices, otherSubMatchedServices } = initMatchArrays(
    equipmentMasterDefs,
    otherMasterDefs,
  );
  const unmatchedServices: Service[] = [];

  for (const service of completed) {
    const usedAppProducts = service.production?.usedAppProducts;
    if (!usedAppProducts || usedAppProducts.length === 0) {
      unmatchedServices.push(service);
      continue;
    }
    const serviceProductIds = new Set(usedAppProducts.map((ap) => ap.productId));
    const equipmentMatch = matchServiceToEquipmentMasters(
      serviceProductIds,
      equipmentConstituentSets,
      equipmentMatchedServices,
      service,
    );
    const otherMatch = matchServiceToOtherMasters(
      serviceProductIds,
      otherMasterDefs,
      otherSubMatchedServices,
      service,
    );
    if (!equipmentMatch && !otherMatch) unmatchedServices.push(service);
  }

  return buildActualsResult(
    equipmentMasterDefs,
    otherMasterDefs,
    equipmentMatchedServices,
    otherSubMatchedServices,
    unmatchedServices,
  );
}
