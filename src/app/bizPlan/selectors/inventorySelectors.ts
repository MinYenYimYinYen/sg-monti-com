import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/Grouper";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelectors";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { baseServCode } from "@/app/realGreen/progServ/_lib/baseServCode";
import {
  EnrichedAppProduct,
  ProductUsagePlanned,
  ProductUsageActual,
  ProductUsageMixed,
  ProductsByServCode,
  ProductsByCustomer,
  ProductsByProgCode,
  ProductsByEmployee,
  ProductComparison,
  SummaryStats,
} from "@/app/bizPlan/types/inventoryTypes";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";

/**
 * 1.2 Product Usage (Planned) Aggregation Selector
 *
 * Aggregates all planned product usage across services using Grouper.summarize()
 */
const selectProductUsagePlanned = createSelector(
  [centralSelect.services],
  (services): ProductUsagePlanned[] => {
    // Step 1: Flatten and enrich all productsPlanned from all services
    const enrichedAppProducts: EnrichedAppProduct[] = services.flatMap(service =>
      service.productsPlanned.map(appProduct => ({
        ...appProduct, // Reuse existing AppProduct structure
        servId: service.servId,
        servCode: service.servCode,
        servCodeId: service.servCodeId,
        customer: service.program.customer,
        program: service.program,
        season: service.season,
        source: 'planned' as const,
      }))
    );

    // Step 2: Group by productId and summarize
    return new Grouper(enrichedAppProducts)
      .groupBy(ap => ap.productId)
      .summarize((productId, products) => {
        // All products in this group share the same productId, so they have the same productCommon
        // We use the first product to extract this shared metadata
        const firstProduct = products[0];

        return {
          productId,
          productCommon: firstProduct.productCommon,
          totalQuantity: Math.round(products.reduce((sum, p) => sum + p.amount, 0)),
          unitOfMeasure: firstProduct.productCommon.unit.desc || '',
          enrichedAppProducts: products,
        };
      });
  }
);

/**
 * 1.3 Product Usage (Actual) Aggregation Selector
 *
 * Aggregates actual products used (historical production data)
 */
const selectProductUsageActual = createSelector(
  [centralSelect.services],
  (services): ProductUsageActual[] => {
    // Step 1: Flatten all usedAppProducts from productions
    const allUsedProducts = services
      .filter(service => service.production !== null)
      .flatMap(service =>
        service.production!.usedAppProducts.map(appProduct => ({
          ...appProduct,
          servId: service.servId,
          custId: service.program.customer.custId,
          progId: service.program.progId,
          production: service.production!,
          customer: service.program.customer,
          program: service.program,
          season: service.season,
        }))
      );

    // Step 2: Group by productId and summarize
    return new Grouper(allUsedProducts)
      .groupBy(ap => ap.productId)
      .summarize((productId, products) => {
        // All products in this group share the same productId, so they have the same productCommon
        // We use the first product to extract this shared metadata
        const firstProduct = products[0];

        return {
          productId,
          productCommon: firstProduct.productCommon,
          totalQuantity: Math.round(products.reduce((sum, p) => sum + p.amount, 0)),
          unitOfMeasure: firstProduct.productCommon.unit.desc || '',
          productionDetails: products.map(p => ({
            servId: p.servId,
            custId: p.custId,
            progId: p.progId,
            amount: Math.round(p.amount),
            production: p.production,
            customer: p.customer,
            program: p.program,
            season: p.season,
          })),
        };
      });
  }
);

/**
 * 1.4 Products Grouped by Service Code
 *
 * Groups products by ServCode for route planning view
 */
const selectProductsByServCode = createSelector(
  [selectProductUsagePlanned, centralSelect.services],
  (productsPlanned, services): ProductsByServCode[] => {
    // Group services by servCodeId for area calculations
    const servicesByServCode = new Grouper(services)
      .groupBy(s => s.servCodeId)
      .toMap();

    // Group products by servCodeId
    const productsByServCode = new Map<string, ProductUsagePlanned[]>();

    productsPlanned.forEach(product => {
      product.enrichedAppProducts.forEach(enriched => {
        if (!productsByServCode.has(enriched.servCodeId)) {
          productsByServCode.set(enriched.servCodeId, []);
        }

        const existingProducts = productsByServCode.get(enriched.servCodeId)!;
        const existingProduct = existingProducts.find(p => p.productId === product.productId);

        if (!existingProduct) {
          // Add product with only relevant enriched products for this servCode
          existingProducts.push({
            ...product,
            enrichedAppProducts: product.enrichedAppProducts.filter(
              e => e.servCodeId === enriched.servCodeId
            ),
            totalQuantity: Math.round(product.enrichedAppProducts
              .filter(e => e.servCodeId === enriched.servCodeId)
              .reduce((sum, e) => sum + e.amount, 0)),
          });
        }
      });
    });

    // Summarize by servCodeId
    return Array.from(productsByServCode.entries()).map(([servCodeId, products]) => {
      const services = servicesByServCode.get(servCodeId) || [];
      const totalArea = Math.round(services.reduce((sum, s) => sum + s.size, 0));
      const firstService = services[0];

      return {
        servCodeId,
        servCode: firstService?.servCode || baseServCode,
        totalServices: services.length,
        totalArea,
        products,
      };
    });
  }
);

/**
 * 1.5 Products Grouped by Customer
 *
 * View product usage per customer
 */
const selectProductsByCustomer = createSelector(
  [selectProductUsagePlanned, centralSelect.customerMap],
  (productsPlanned, customerMap): ProductsByCustomer[] => {
    // Group products by customer
    const productsByCustomer = new Map<number, ProductUsagePlanned[]>();

    productsPlanned.forEach(product => {
      product.enrichedAppProducts.forEach(enriched => {
        const custId = enriched.customer.custId;

        if (!productsByCustomer.has(custId)) {
          productsByCustomer.set(custId, []);
        }

        const existingProducts = productsByCustomer.get(custId)!;
        const existingProduct = existingProducts.find(p => p.productId === product.productId);

        if (!existingProduct) {
          existingProducts.push({
            ...product,
            enrichedAppProducts: product.enrichedAppProducts.filter(
              e => e.customer.custId === custId
            ),
            totalQuantity: Math.round(product.enrichedAppProducts
              .filter(e => e.customer.custId === custId)
              .reduce((sum, e) => sum + e.amount, 0)),
          });
        }
      });
    });

    // Summarize by customer
    return Array.from(productsByCustomer.entries()).map(([custId, products]) => {
      const customer = customerMap.get(custId);
      const allEnrichedProducts = products.flatMap(p => p.enrichedAppProducts);
      const totalArea = Math.round(allEnrichedProducts.reduce((sum, e) => sum + e.size, 0));

      return {
        custId,
        customer: customer!,
        products: products.map(p => ({
          productId: p.productId,
          productCommon: p.productCommon,
          totalQuantity: p.totalQuantity,
          unitOfMeasure: p.unitOfMeasure,
          services: p.enrichedAppProducts.map(e => ({
            servId: e.servId,
            amount: Math.round(e.amount),
            size: Math.round(e.size),
            servCodeId: e.servCodeId,
            progId: e.program.progId,
          })),
        })),
        totalServices: new Set(allEnrichedProducts.map(e => e.servId)).size,
        totalArea,
      };
    });
  }
);

/**
 * 1.6 Products Grouped by Program Code
 *
 * View product usage by seasonal program
 */
const selectProductsByProgCode = createSelector(
  [selectProductUsagePlanned, progServSelect.progCodes],
  (productsPlanned, progCodes): ProductsByProgCode[] => {
    const progCodeMap = new Grouper(progCodes).toUniqueMap(pc => pc.progCodeId);
    const productsByProgCode = new Map<string, ProductUsagePlanned[]>();

    productsPlanned.forEach(product => {
      product.enrichedAppProducts.forEach(enriched => {
        const progCodeId = enriched.program.progCode.progCodeId;

        if (!productsByProgCode.has(progCodeId)) {
          productsByProgCode.set(progCodeId, []);
        }

        const existingProducts = productsByProgCode.get(progCodeId)!;
        const existingProduct = existingProducts.find(p => p.productId === product.productId);

        if (!existingProduct) {
          existingProducts.push({
            ...product,
            enrichedAppProducts: product.enrichedAppProducts.filter(
              e => e.program.progCode.progCodeId === progCodeId
            ),
            totalQuantity: Math.round(product.enrichedAppProducts
              .filter(e => e.program.progCode.progCodeId === progCodeId)
              .reduce((sum, e) => sum + e.amount, 0)),
          });
        }
      });
    });

    // Summarize by progCode
    return Array.from(productsByProgCode.entries()).map(([progCodeId, products]) => {
      const progCode = progCodeMap.get(progCodeId);
      const allEnrichedProducts = products.flatMap(p => p.enrichedAppProducts);
      const totalArea = Math.round(allEnrichedProducts.reduce((sum, e) => sum + e.size, 0));
      const uniquePrograms = new Set(allEnrichedProducts.map(e => e.program.progId)).size;

      return {
        progCodeId,
        progCode: progCode!,
        season: allEnrichedProducts[0]?.season || 0,
        products,
        totalServices: new Set(allEnrichedProducts.map(e => e.servId)).size,
        totalPrograms: uniquePrograms,
        totalArea,
      };
    });
  }
);

/**
 * 1.7 Products Grouped by Employee
 *
 * View product usage per employee with percent attribution
 * Uses double-grouping pattern: first by employee, then by product within employee
 */
const selectProductsByEmployee = createSelector(
  [selectProductUsageActual],
  (productsActual): ProductsByEmployee[] => {
    // Step 1: Flatten to employee-product pairs with percent attribution
    // This creates one entry for each (employee, service, product) combination
    const allEmployeeWork = productsActual.flatMap(product =>
      product.productionDetails.flatMap(pd =>
        pd.production.doneBys.map(doneBy => ({
          employeeId: doneBy.employeeId,
          employee: doneBy.employee,
          percent: doneBy.percent, // Decimal: 1 = 100%, 0.5 = 50%
          productId: product.productId,
          productCommon: product.productCommon,
          amount: Math.round(pd.amount),
          attributedAmount: Math.round(pd.amount * doneBy.percent), // KEY: Apply percent
          size: Math.round(pd.production.serviceDoc.size || 0),
          attributedSize: Math.round((pd.production.serviceDoc.size || 0) * doneBy.percent), // KEY: Apply percent
          servId: pd.servId,
          custId: pd.custId,
          production: pd.production,
          customer: pd.customer,
        }))
      )
    );

    // Step 2: First grouping - by employeeId
    // Groups all work done by each employee
    return new Grouper(allEmployeeWork)
      .groupBy(work => work.employeeId)
      .summarize((employeeId, workByOneEmployee) => {
        // workByOneEmployee = all services this one employee worked on
        const firstWork = workByOneEmployee[0];

        // Step 3: Second grouping - by productId within this employee
        // Groups multiple uses of the same product by this employee
        const productGroups = new Grouper(workByOneEmployee)
          .groupBy(work => work.productId)
          .summarize((productId, usesOfThisProduct) => {
            // usesOfThisProduct = all times this employee used this specific product
            // All uses share the same productId, so they have the same productCommon
            const firstUse = usesOfThisProduct[0];

            return {
              productId,
              productCommon: firstUse.productCommon,
              totalQuantity: Math.round(usesOfThisProduct.reduce(
                (sum, use) => sum + use.attributedAmount, // Sum attributed amounts
                0
              )),
              unitOfMeasure: firstUse.productCommon.unit.desc || '',
              productions: usesOfThisProduct.map(use => ({
                servId: use.servId,
                custId: use.custId,
                amount: use.amount,
                attributedAmount: use.attributedAmount,
                percent: use.percent,
                size: use.size,
                attributedSize: use.attributedSize,
                production: use.production,
                customer: use.customer,
              })),
            };
          });

        return {
          employeeId,
          employee: firstWork.employee,
          products: productGroups,
          totalProductions: new Set(workByOneEmployee.map(w => w.servId)).size,
          totalAttributedArea: Math.round(workByOneEmployee.reduce(
            (sum, w) => sum + w.attributedSize,
            0
          )),
        };
      });
  }
);

/**
 * 1.8 Summary Statistics Selector
 *
 * Top-level metrics for dashboard
 */
const selectSummaryStats = createSelector(
  [centralSelect.services, selectProductUsagePlanned],
  (services, productsPlanned): SummaryStats => {
    const totalArea = Math.round(services.reduce((sum, s) => sum + s.size, 0));
    const totalQuantity = Math.round(productsPlanned.reduce((sum, p) => sum + p.totalQuantity, 0));

    return {
      totalServices: services.length,
      totalArea,
      totalProducts: productsPlanned.length,
      totalQuantity,
    };
  }
);

/**
 * 1.9 Mixed Actual/Planned Products Selector
 *
 * Combines actual (completed) and planned (remaining) products for current season analysis
 * Uses actual production data for completed services (status === "S"), planned for remaining
 */
const selectProductsMixedActualPlanned = createSelector(
  [centralSelect.services],
  (services): ProductUsageMixed[] => {
    // Step 1: Flatten all products, choosing actual or planned based on status
    const mixedProducts: EnrichedAppProduct[] = services.flatMap(service => {
      const isComplete = service.status === "S";
      const products = isComplete
        ? service.production?.usedAppProducts || []
        : service.productsPlanned;

      return products.map(p => ({
        ...p,
        servId: service.servId,
        servCode: service.servCode,
        servCodeId: service.servCodeId,
        customer: service.program.customer,
        program: service.program,
        season: service.season,
        source: isComplete ? 'actual' as const : 'planned' as const,
      }));
    });

    // Step 2: Group by productId and summarize
    return new Grouper(mixedProducts)
      .groupBy(p => p.productId)
      .summarize((productId, products) => {
        // All products in this group share the same productId, so they have the same productCommon
        // We use the first product to extract this shared metadata
        const firstProduct = products[0];
        const actualProducts = products.filter(p => p.source === 'actual');
        const plannedProducts = products.filter(p => p.source === 'planned');

        return {
          productId,
          productCommon: firstProduct.productCommon,
          totalQuantity: Math.round(products.reduce((sum, p) => sum + p.amount, 0)),
          unitOfMeasure: firstProduct.productCommon.unit.desc || '',
          actual: {
            quantity: Math.round(actualProducts.reduce((sum, p) => sum + p.amount, 0)),
            services: new Set(actualProducts.map(p => p.servId)).size,
          },
          planned: {
            quantity: Math.round(plannedProducts.reduce((sum, p) => sum + p.amount, 0)),
            services: new Set(plannedProducts.map(p => p.servId)).size,
          },
          mixedProducts: products,
        };
      });
  }
);

/**
 * 1.10 LY vs TY Comparison Selector
 *
 * Side-by-side comparison of last year vs this year
 * Works with whatever seasons are loaded into state, comparing based on globalSettings.season
 */
const selectProductComparison = createSelector(
  [centralSelect.services, globalSettingsSelect.season],
  (allServices, currentSeason = baseGlobalSettings.season): ProductComparison[] => {
    const lyServices = allServices.filter(s => s.season === currentSeason - 1);
    const tyServices = allServices.filter(s => s.season === currentSeason);

    // Build usage maps for LY and TY
    const buildUsageMap = (services: typeof allServices) => {
      const map = new Map<number, { quantity: number; serviceCount: number }>();
      services.forEach(service => {
        service.productsPlanned.forEach(appProduct => {
          const existing = map.get(appProduct.productId) || { quantity: 0, serviceCount: 0 };
          map.set(appProduct.productId, {
            quantity: existing.quantity + appProduct.amount,
            serviceCount: existing.serviceCount + 1,
          });
        });
      });
      return map;
    };

    const lyUsage = buildUsageMap(lyServices);
    const tyUsage = buildUsageMap(tyServices);

    // Get all unique productIds
    const allProductIds = new Set([...lyUsage.keys(), ...tyUsage.keys()]);

    return Array.from(allProductIds).map(productId => {
      const ly = lyUsage.get(productId) || { quantity: 0, serviceCount: 0 };
      const ty = tyUsage.get(productId) || { quantity: 0, serviceCount: 0 };

      const quantityDiff = ty.quantity - ly.quantity;
      const quantityPercent = ly.quantity > 0 ? (quantityDiff / ly.quantity) * 100 : 0;
      const serviceDiff = ty.serviceCount - ly.serviceCount;

      // Get productCommon from first available service
      const firstService = [...lyServices, ...tyServices].find(s =>
        s.productsPlanned.some(ap => ap.productId === productId)
      );
      const productCommon = firstService?.productsPlanned.find(
        ap => ap.productId === productId
      )?.productCommon;

      return {
        productId,
        productCommon: productCommon!,
        lastYear: { quantity: Math.round(ly.quantity), services: ly.serviceCount },
        thisYear: { quantity: Math.round(ty.quantity), services: ty.serviceCount },
        variance: {
          quantityDiff: Math.round(quantityDiff),
          quantityPercent: Math.round(quantityPercent * 100) / 100, // Round to 2 decimals
          serviceDiff
        },
      };
    }).filter(p => p.productCommon); // Filter out any missing productCommon
  }
);

export const inventorySelectors = {
  // Core aggregations
  productUsagePlanned: selectProductUsagePlanned,
  productUsageActual: selectProductUsageActual,
  productsMixedActualPlanned: selectProductsMixedActualPlanned,

  // Grouped views
  productsByServCode: selectProductsByServCode,
  productsByCustomer: selectProductsByCustomer,
  productsByProgCode: selectProductsByProgCode,
  productsByEmployee: selectProductsByEmployee,

  // Summary & comparison
  summaryStats: selectSummaryStats,
  productComparison: selectProductComparison,
};
