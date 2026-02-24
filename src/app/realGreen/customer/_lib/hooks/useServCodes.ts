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

  return { getServCodeCounts };
}