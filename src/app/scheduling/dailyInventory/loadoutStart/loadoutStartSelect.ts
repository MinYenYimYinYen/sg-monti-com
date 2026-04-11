import { createSelector } from "@reduxjs/toolkit";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { AppState } from "@/store";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { assignmentSelect } from "@/app/assignment/assignmentSelect";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { createValidationSelectors } from "@/lib/validation/createValidationSelectors";
import { LoadoutValidator } from "@/app/loadout/LoadoutValidator";
import { hydratePlannedLoadout, getProductMasters } from "@/app/realGreen/customer/selectors/hydratePlannedLoadout";
import { aggregateLoadoutInventory } from "@/app/scheduling/dailyInventory/loadoutStart/aggregateLoadoutInventory";
import { progServBaseSelect } from "@/app/realGreen/progServ/_lib/selectors/progServBaseSelectors";

const selectTech = (state: AppState) => state.loadoutStart.tech;
const selectRouteDate = (state: AppState) => state.loadoutStart.routeDate;

/**
 * Services for the selected tech on the selected date.
 * Derived from the byAssignment customer context (loaded via useLoadoutPageDeps).
 * Filters centralSelect.services by matching assignment records for the current date.
 */
const selectServices = createSelector(
  [centralSelect.services, assignmentSelect.servIdsByEmployee, selectTech],
  (services, servIdsByEmployee, tech) => {
    if (!tech) return [];
    const assignmentsForTech = servIdsByEmployee.get(tech);
    if (!assignmentsForTech || assignmentsForTech.length === 0) return [];
    const servIdSet = new Set(assignmentsForTech.map((a) => a.servId));
    return services.filter((s) => servIdSet.has(s.servId));
  },
);

/**
 * All techs that have assignments on the currently loaded date.
 * Derived from the assignment slice (no customer data needed).
 */
const selectAvailableTechs = assignmentSelect.techsForDate;

/**
 * routesByDate is kept for backward compatibility with components that use it.
 * Since we now load one date at a time, this always contains at most one entry.
 */
const selectRoutesByDate = createSelector(
  [selectRouteDate, selectServices],
  (routeDate, services): Map<string, Service[]> => {
    const result = new Map<string, Service[]>();
    if (routeDate && services.length > 0) {
      result.set(routeDate, services);
    }
    return result;
  },
);

const selectRouteDates = createSelector(
  [selectRoutesByDate],
  (routesByDate) => Array.from(routesByDate.keys()),
);

const selectGetRouteForDate = (date: string) =>
  createSelector([selectRoutesByDate], (routesByDate) => routesByDate.get(date) ?? []);

const selectLoadout = (state: AppState) => state.loadoutStart.loadout;
const selectPendingProductSlots = (state: AppState) => state.loadoutStart.pendingProductSlots;
const selectPendingSlotProducts = (state: AppState) => state.loadoutStart.pendingSlotProducts;
const selectPendingSlotAmounts = (state: AppState) => state.loadoutStart.pendingSlotAmounts;
const selectPackageSelections = (state: AppState) => state.loadoutStart.packageSelections;
const selectTruckId = (state: AppState) => state.loadoutStart.truckId;
const selectRideOnId = (state: AppState) => state.loadoutStart.rideOnId;
const selectTruckTouched = (state: AppState) => state.loadoutStart.truckTouched;
const selectRideOnTouched = (state: AppState) => state.loadoutStart.rideOnTouched;
const selectShowAllLoadoutIssues = (state: AppState) => state.loadoutStart.showAllLoadoutIssues;

const selectShowTruckError = createSelector(
  [selectTruckId, selectTruckTouched, selectShowAllLoadoutIssues],
  (truckId, truckTouched, showAll) => !truckId && (truckTouched || showAll),
);

const selectShowRideOnError = createSelector(
  [selectRideOnId, selectRideOnTouched, selectShowAllLoadoutIssues],
  (rideOnId, rideOnTouched, showAll) => !rideOnId && (rideOnTouched || showAll),
);

const selectUsedProductIds = createSelector(
  [selectLoadout],
  (loadout) => {
    const usedIds = new Set<number>();

    loadout.masters.forEach((master) => {
      master.equipments.forEach((equipment) => {
        equipment.constituents.forEach((constituent) => {
          usedIds.add(constituent.product.productId);
        });
      });
      master.subProducts.forEach((sub) => {
        usedIds.add(sub.product.productId);
      });
    });

    loadout.singles.forEach((single) => {
      usedIds.add(single.product.productId);
    });

    loadout.subProducts.forEach((sub) => {
      usedIds.add(sub.product.productId);
    });

    return usedIds;
  },
);

const selectProductCategories = createSelector(
  [productSelect.productSubs, productSelect.productSingles],
  (subs, singles) => {
    const categories = new Set<string>();
    subs.forEach((sub) => { if (sub.category) categories.add(sub.category); });
    singles.forEach((single) => { if (single.category) categories.add(single.category); });
    return Array.from(categories).sort();
  },
);

const selectAvailableProducts = createSelector(
  [productSelect.productSubs, productSelect.productSingles, selectUsedProductIds],
  (subs, singles, usedIds): (ProductSub | ProductSingle)[] => {
    const availableSubs = subs.filter((sub) => !usedIds.has(sub.productId));
    const availableSingles = singles.filter((single) => !usedIds.has(single.productId));
    return [...availableSubs, ...availableSingles].sort((a, b) =>
      a.description.localeCompare(b.description),
    );
  },
);

const selectProductsByCategory = (categoryFilter: string | null) =>
  createSelector([selectAvailableProducts], (products) => {
    if (!categoryFilter) return products;
    return products.filter((product) => product.category === categoryFilter);
  });

const selectProductsForPendingSlots = createSelector(
  [selectPendingProductSlots, selectAvailableProducts],
  (pendingSlots, availableProducts) => {
    const productsMap = new Map<string, (ProductSub | ProductSingle)[]>();

    pendingSlots.forEach((slot) => {
      const filteredProducts = slot.categoryFilter
        ? availableProducts.filter((product) => product.category === slot.categoryFilter)
        : availableProducts;
      productsMap.set(slot.id, filteredProducts);
    });

    return productsMap;
  },
);

const selectLoadoutTouchedFields = (state: AppState) => state.loadoutStart.loadoutTouchedFields;

const selectIsFieldTouched = (fieldPath: string) =>
  createSelector(
    [selectLoadoutTouchedFields],
    (touchedFields) => touchedFields.has(fieldPath),
  );

/**
 * selectServiceResolvedLoadout — re-runs hydratePlannedLoadout for each service
 * with the worker's current packageSelections, then aggregates across all services.
 *
 * This is the package-aware version of the inventory. service.loadoutInventory (baked into
 * centralSelectors) is package-agnostic; this selector applies the runtime package choice.
 */
const selectServiceResolvedLoadout = createSelector(
  [selectServices, selectPackageSelections, progServBaseSelect.basicServCodeMap],
  (services, packageSelections, servCodeMap) => {
    const inventories = services.map((service) =>
      hydratePlannedLoadout({ servDoc: service, servCodeMap, packageSelections }),
    );
    return aggregateLoadoutInventory(inventories);
  },
);

/**
 * selectTotalKsfForMaster — sums the size (ksf) of all route services that actually produce
 * the given master product. A service only produces a master if its size satisfies the
 * product rule's size operator (lte / gt / all), so we re-run getProductMasters per service.
 */
const selectTotalKsfForMaster = (masterProductId: number) =>
  createSelector(
    [selectServices, progServBaseSelect.basicServCodeMap],
    (services, servCodeMap) =>
      services.reduce((sum, service) => {
        const servCode = servCodeMap.get(service.servCodeId);
        if (!servCode) return sum;
        const hasMaster = getProductMasters(servCode, service.size).some(
          (m) => m.productId === masterProductId,
        );
        return hasMaster ? sum + service.size : sum;
      }, 0),
  );

const selectStartValidation = createValidationSelectors({
  selectData: selectLoadout,
  selectTouchedFields: selectLoadoutTouchedFields,
  selectShowAll: (state: AppState) => state.loadoutStart.showAllLoadoutIssues,
  validator: class extends LoadoutValidator {
    constructor() {
      super("start");
    }
  },
});

export const loadoutStartSelect = {
  tech: selectTech,
  routeDate: selectRouteDate,
  truckId: selectTruckId,
  rideOnId: selectRideOnId,
  routesByDate: selectRoutesByDate,
  routeDates: selectRouteDates,
  getRouteForDate: selectGetRouteForDate,
  services: selectServices,
  availableTechs: selectAvailableTechs,
  loadout: {
    data: selectLoadout,
    startValidation: selectStartValidation,
  },
  pendingProductSlots: selectPendingProductSlots,
  pendingSlotProducts: selectPendingSlotProducts,
  pendingSlotAmounts: selectPendingSlotAmounts,
  packageSelections: selectPackageSelections,
  usedProductIds: selectUsedProductIds,
  productCategories: selectProductCategories,
  availableProducts: selectAvailableProducts,
  productsByCategory: selectProductsByCategory,
  productsForPendingSlots: selectProductsForPendingSlots,
  loadoutTouchedFields: selectLoadoutTouchedFields,
  isFieldTouched: selectIsFieldTouched,
  serviceResolvedLoadout: selectServiceResolvedLoadout,
  totalKsfForMaster: selectTotalKsfForMaster,
  showTruckError: selectShowTruckError,
  showRideOnError: selectShowRideOnError,
};
