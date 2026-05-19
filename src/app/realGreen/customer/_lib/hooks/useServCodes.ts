import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

export function useServCodes() {
  function getServCodeCounts(services: Service[]) {
    const servCodeCounts = new Grouper(services)
      .groupBy((s) => s.servCode.servCodeId)
      .summarize((servCodeId, services) => {
        return {
          servCodeId,
          count: services.length,
          size: services.reduce((acc, service) => acc + service.size, 0),
          price: services.reduce((acc, service) => acc + service.price, 0),
        };
      });
    return servCodeCounts;
  }
  
  function getServicesByRuleDesc(services: Service[]) {
    // Build groups keyed by "servCodeId-ruleDesc" (or just "servCodeId" for no-rule services).
    // Iterating service-by-rule directly avoids the pivot() approach, which incorrectly
    // merges services from different servCodes that share the same rule description.
    const result = new Map<string, Service[]>();

    services.forEach((service) => {
      const servCodeId = service.servCode.servCodeId;

      if (service.servCode.productRules.length === 0) {
        const key = servCodeId;
        if (!result.has(key)) result.set(key, []);
        result.get(key)!.push(service);
      } else {
        const matchingRules = service.servCode.productRules.filter((rule) => {
          switch (rule.sizeOperator) {
            case "all":
              return true;
            case "lte":
              return service.size <= rule.size;
            case "gt":
              return service.size > rule.size;
            default:
              return false;
          }
        });

        matchingRules.forEach((rule) => {
          const key = `${servCodeId}-${rule.desc}`;
          if (!result.has(key)) result.set(key, []);
          result.get(key)!.push(service);
        });
      }
    });

    return Array.from(result.entries()).map(([idWithRule, groupServices]) => ({
      idWithRule,
      services: groupServices,
    }));
  }

  return { getServCodeCounts, getServicesByRuleDesc };
}