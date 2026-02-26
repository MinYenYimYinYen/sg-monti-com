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
    // Separate services with rules from those without
    const servicesWithRules: Service[] = [];
    const servicesWithoutRules: Service[] = [];

    services.forEach((service) => {
      if (service.servCode.productRules.length === 0) {
        servicesWithoutRules.push(service);
      } else {
        servicesWithRules.push(service);
      }
    });

    // Pivot to flatten services -> productRules relationship
    // Filter rules to only include those that match the service's size
    const pivoted = new Grouper(servicesWithRules)
      .pivot(
        (service) => {
          return service.servCode.productRules.filter((rule) => {
            const operator = rule.sizeOperator;
            switch (operator) {
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
        },
        "services",
        "desc"
      );

    // Group by servCodeId and rule description
    const grouped = new Grouper(pivoted)
      .groupBy((rule) => {
        const service = rule.services[0];
        return `${service.servCode.servCodeId}-${rule.desc}`;
      })
      .summarize((idWithRule, rules) => {
        const allServices = rules.flatMap((rule) => rule.services);
        return {
          idWithRule,
          services: allServices,
        };
      });

    // Group services without rules by servCodeId
    const groupedWithoutRules = new Grouper(servicesWithoutRules)
      .groupBy((service) => service.servCode.servCodeId)
      .summarize((idWithRule, services) => {
        return {
          idWithRule,
          services,
        };
      });

    // Combine both groups
    return [...grouped, ...groupedWithoutRules];
  }

  return { getServCodeCounts, getServicesByRuleDesc };
}