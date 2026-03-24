import { createSelector } from "@reduxjs/toolkit";
import { coverSheetsSelect } from "@/app/scheduling/coverSheets/_lib/selectors/coverSheetsSelect";
import { authSelect } from "@/app/auth/authSlice";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { AppState } from "@/store";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";

const selectAuthTech = createSelector([authSelect.user], (user) => user?.saId);
const selectTech = (state: AppState) => state.techRoute.tech;

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
      // const services = employeeMap.get("1BT");
      if (services) {
        result.set(date, services);
      }
    });

    return result;
  },
);

const selectRouteDates = createSelector(
  [selectRoutesByDate],
  (routesByDate) => {
    return Array.from(routesByDate.keys());
  },
);

const selectGetRouteForDate = (date: string) =>
  createSelector([selectRoutesByDate], (routesByDate) => {
    return routesByDate.get(date) ?? [];
  });

const selectRouteDate = (state: AppState) => state.techRoute.routeDate;

const selectServices = createSelector(
  [selectRouteDate, selectRoutesByDate],
  (routeDate, routesByDate) => {
    if (!routeDate) return [];
    const services = routesByDate.get(routeDate) ?? [];
    return services;
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

const selectStartLoadout = (state: AppState) => state.techRoute.startLoadout;

const selectPendingProductSlots = (state: AppState) => state.techRoute.pendingProductSlots;

const selectUsedProductIds = createSelector(
  [selectStartLoadout],
  (startLoadout) => {
    const usedIds = new Set<number>();

    // From masters
    startLoadout.masters.forEach((master) => {
      // From appMethods
      master.appMethods.forEach((appMethod) => {
        // mixProduct
        usedIds.add(appMethod.mixProduct.productId);
        // appMethod subProducts
        appMethod.subProducts.forEach((sub) => {
          usedIds.add(sub.product.productId);
        });
      });

      // From master subProducts
      master.subProducts.forEach((sub) => {
        usedIds.add(sub.product.productId);
      });
    });

    // From CustomProducts
    startLoadout.singles.forEach((single) => {
      usedIds.add(single.product.productId);
    });

    startLoadout.subProducts.forEach((sub) => {
      usedIds.add(sub.product.productId);
    });

    return usedIds;
  },
);

const selectProductCategories = createSelector(
  [productSelect.productSubs, productSelect.productSingles],
  (subs, singles) => {
    const categories = new Set<string>();

    subs.forEach((sub) => {
      if (sub.category) categories.add(sub.category);
    });

    singles.forEach((single) => {
      if (single.category) categories.add(single.category);
    });

    return Array.from(categories).sort();
  },
);

const selectAvailableProducts = createSelector(
  [productSelect.productSubs, productSelect.productSingles, selectUsedProductIds],
  (subs, singles, usedIds): (ProductSub | ProductSingle)[] => {
    const availableSubs = subs.filter((sub) => !usedIds.has(sub.productId));
    const availableSingles = singles.filter((single) => !usedIds.has(single.productId));

    return [...availableSubs, ...availableSingles].sort((a, b) =>
      a.description.localeCompare(b.description)
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

export const techRouteSelect = {
  routesByDate: selectRoutesByDate,
  routeDates: selectRouteDates,
  getRouteForDate: selectGetRouteForDate,
  routeDate: selectRouteDate,
  services: selectServices,
  availableTechs: selectAvailableTechs,
  tech: selectDefaultTech,
  startLoadout: selectStartLoadout,
  pendingProductSlots: selectPendingProductSlots,
  usedProductIds: selectUsedProductIds,
  productCategories: selectProductCategories,
  availableProducts: selectAvailableProducts,
  productsByCategory: selectProductsByCategory,
  productsForPendingSlots: selectProductsForPendingSlots,
};
