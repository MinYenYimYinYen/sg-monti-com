import { createSelector } from "@reduxjs/toolkit";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { authSelect } from "@/app/auth/authSlice";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { AppState } from "@/store";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { createValidationSelectors } from "@/lib/validation/createValidationSelectors";
import { LoadoutValidator } from "@/app/scheduling/dailyInventory/_lib/LoadoutValidator";
import { hydratePlannedLoadout, getProductMasters } from "@/app/realGreen/customer/selectors/hydratePlannedLoadout";
import { aggregateLoadoutInventory } from "@/app/scheduling/dailyInventory/_lib/aggregateLoadoutInventory";
import { progServBaseSelect } from "@/app/realGreen/progServ/_lib/selectors/progServBaseSelectors";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { PendingProductSlot } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSlice";

const selectAuthTech = createSelector([authSelect.user], (user) => user?.saId);
const selectTech = (state: AppState) => state.loadoutStart.tech;

const selectDefaultTech = createSelector(
  [selectAuthTech, selectTech],
  (authTech, tech) => (tech ? tech : authTech),
);

const selectRoutesByDate = createSelector(
  [coverSheetsSelect.servicesByDateAndEmployee, selectDefaultTech],
  (byDateAndEmployee, defaultTech) => {
    const result = new Map<string, Service[]>();

    byDateAndEmployee.forEach((employeeMap, date) => {
      const services = employeeMap.get(defaultTech ?? "");
      if (services) {
        result.set(date, services);
      }
    });

    return result;
  },
);

const selectRouteDates = createSelector(
  [selectRoutesByDate],
  (routesByDate) => Array.from(routesByDate.keys()),
);

const selectGetRouteForDate = (date: string) =>
  createSelector([selectRoutesByDate], (routesByDate) => routesByDate.get(date) ?? []);

const selectRouteDate = (state: AppState) => state.loadoutStart.routeDate;

const selectServices = createSelector(
  [selectRouteDate, selectRoutesByDate],
  (routeDate, routesByDate) => {
    if (!routeDate) return [];
    return routesByDate.get(routeDate) ?? [];
  },
);

const selectAvailableTechs = createSelector(
  [coverSheetsSelect.servicesByDateAndEmployee],
  (byDateAndEmployee) => {
    const techIds = new Set<string>();
    byDateAndEmployee.forEach((employeeMap) => {
      employeeMap.forEach((_, employeeId) => {
        techIds.add(employeeId);
      });
    });
    return Array.from(techIds).sort();
  },
);

const selectLoadout = (state: AppState) => state.loadoutStart.loadout;
const selectPendingProductSlots = (state: AppState) => state.loadoutStart.pendingProductSlots;
const selectPendingSlotProducts = (state: AppState) => state.loadoutStart.pendingSlotProducts;
const selectPendingSlotAmounts = (state: AppState) => state.loadoutStart.pendingSlotAmounts;
const selectPackageSelections = (state: AppState) => state.loadoutStart.packageSelections;
const selectTruckId = (state: AppState) => state.loadoutStart.truckId;
const selectRideOnId = (state: AppState) => state.loadoutStart.rideOnId;

const selectUsedProductIds = createSelector(
  [selectLoadout],
  (loadout) => {
    const usedIds = new Set<number>();

    loadout.masters.forEach((master) => {
      master.equipments.forEach((equipment) => {
        usedIds.add(equipment.mixProduct.productId);
        equipment.subProducts.forEach((sub: { product: { productId: number } }) => {
          usedIds.add(sub.product.productId);
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
  tech: selectDefaultTech,
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
};
