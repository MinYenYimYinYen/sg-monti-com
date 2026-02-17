import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { baseServCode } from "@/app/realGreen/progServ/_lib/baseServCode";
import {
  EnrichedAppProduct,
  ProductUsagePlanned,
  ProductsByServCode,
} from "@/app/bizPlan/types/inventoryTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceStatusType } from "@/app/realGreen/_lib/subTypes/serviceStatus";

/**
 * Filter Criteria Type - Single source of truth for what "filtering" means
 *
 * This type defines all possible ways to filter the base service dataset.
 * All downstream selectors will operate on services filtered by these criteria.
 */
export type ServiceFilterCriteria = {
  serviceStatuses?: string[];
  season?: number;
  // Future expansion: progCodeIds?, custIds?, servCodeIds?, dateRange?, etc.
};

/**
 * BASE SELECTOR FACTORY - Single source of truth for filtered services
 *
 * This is the foundational selector that all downstream selectors MUST consume.
 * It applies the filter criteria to the raw service data from Redux state.
 *
 * @param criteria - Filtering rules to apply to services
 * @returns A memoized selector that returns filtered services
 */
export const createFilteredServicesSelector = (criteria: ServiceFilterCriteria) =>
  createSelector(
    [centralSelect.services],
    (allServices): Service[] => {
      let filtered = allServices;

      if (criteria.serviceStatuses && criteria.serviceStatuses.length > 0) {
        filtered = filtered.filter((s) =>
          criteria.serviceStatuses!.includes(s.status),
        );
      }

      if (criteria.season !== undefined) {
        filtered = filtered.filter((s) => s.season === criteria.season);
      }

      return filtered;
    },
  );

/**
 * BASE AGGREGATION SELECTOR - Product Usage (Planned) from Filtered Services
 *
 * This selector aggregates product usage across the filtered service set.
 * It MUST accept a filtered services selector as input, ensuring data consistency.
 *
 * @param filteredServicesSelector - The base filtered services selector
 * @returns A memoized selector that returns aggregated product usage
 */
export const createProductUsagePlannedSelector = (
  filteredServicesSelector: ReturnType<typeof createFilteredServicesSelector>,
) =>
  createSelector(
    [filteredServicesSelector],
    (services): ProductUsagePlanned[] => {
      // Step 1: Flatten and enrich all productsPlanned from filtered services
      const enrichedAppProducts: EnrichedAppProduct[] = services.flatMap(
        (service) =>
          service.productsPlanned.map((appProduct) => ({
            ...appProduct,
            servId: service.servId,
            servCode: service.servCode,
            servCodeId: service.servCodeId,
            customer: service.program.customer,
            program: service.program,
            service,
            season: service.season,
            source: "planned" as const,
          })),
      );

      // Step 2: Group by productId and summarize
      return new Grouper(enrichedAppProducts)
        .groupBy((ap) => ap.productId)
        .summarize((productId, products) => {
          const firstProduct = products[0];

          return {
            productId,
            productCommon: firstProduct.productCommon,
            totalQuantity: Math.round(
              products.reduce((sum, p) => sum + p.amount, 0),
            ),
            unitOfMeasure: firstProduct.productCommon.unit.desc || "",
            enrichedAppProducts: products,
          };
        });
    },
  );

/**
 * GROUPED VIEW SELECTOR - Products by Service Code
 *
 * Groups products by service code for route planning view.
 * Operates on filtered product usage and filtered services, ensuring consistency.
 *
 * @param productUsagePlannedSelector - Filtered product usage selector
 * @param filteredServicesSelector - Filtered services selector (for area calculations)
 * @returns A memoized selector that returns products grouped by service code
 */
export const createProductsByServCodeSelector = (
  productUsagePlannedSelector: ReturnType<
    typeof createProductUsagePlannedSelector
  >,
  filteredServicesSelector: ReturnType<typeof createFilteredServicesSelector>,
) =>
  createSelector(
    [productUsagePlannedSelector, filteredServicesSelector],
    (productsPlanned, services): ProductsByServCode[] => {
      // Group services by servCodeId for area calculations
      // Services are already filtered, so totals will match product data
      const servicesByServCode = new Grouper(services)
        .groupBy((s) => s.servCodeId)
        .toMap();

      // Group products by servCodeId
      const productsByServCode = new Map<string, ProductUsagePlanned[]>();

      productsPlanned.forEach((product) => {
        product.enrichedAppProducts.forEach((enriched) => {
          if (!productsByServCode.has(enriched.servCodeId)) {
            productsByServCode.set(enriched.servCodeId, []);
          }

          const existingProducts = productsByServCode.get(enriched.servCodeId)!;
          const existingProduct = existingProducts.find(
            (p) => p.productId === product.productId,
          );

          if (!existingProduct) {
            // Add product with only relevant enriched products for this servCode
            existingProducts.push({
              ...product,
              enrichedAppProducts: product.enrichedAppProducts.filter(
                (e) => e.servCodeId === enriched.servCodeId,
              ),
              totalQuantity: Math.round(
                product.enrichedAppProducts
                  .filter((e) => e.servCodeId === enriched.servCodeId)
                  .reduce((sum, e) => sum + e.amount, 0),
              ),
            });
          }
        });
      });

      // Summarize by servCodeId
      return Array.from(productsByServCode.entries()).map(
        ([servCodeId, products]) => {
          const services = servicesByServCode.get(servCodeId) || [];
          const totalArea = Math.round(
            services.reduce((sum, s) => sum + s.size, 0),
          );
          const firstService = services[0];

          return {
            servCodeId,
            servCode: firstService?.servCode || baseServCode,
            totalServices: services.length,
            totalArea,
            products,
          };
        },
      );
    },
  );

/**
 * CONVENIENCE FACTORY - Pre-composed Selector Set
 *
 * Creates a complete set of inventory selectors from a single filter criteria object.
 * This provides a clean API for consumers and ensures all selectors are consistently filtered.
 *
 * @param criteria - Filter criteria to apply to all selectors
 * @returns An object containing all composed inventory selectors
 *
 * @example
 * ```typescript
 * // In a React component
 * const selectors = useMemo(
 *   () => createInventorySelectors({
 *     serviceStatuses: ["active", "printed", "asap"]
 *   }),
 *   [serviceStatuses]
 * );
 *
 * const productsPlanned = useSelector(selectors.productsPlanned);
 * const productsByServCode = useSelector(selectors.productsByServCode);
 * ```
 */
export const createInventorySelectors = (criteria: ServiceFilterCriteria) => {
  const filteredServices = createFilteredServicesSelector(criteria);
  const productsPlanned = createProductUsagePlannedSelector(filteredServices);

  return {
    filteredServices,
    productsPlanned,
    productsByServCode: createProductsByServCodeSelector(
      productsPlanned,
      filteredServices,
    ),
  };
};
