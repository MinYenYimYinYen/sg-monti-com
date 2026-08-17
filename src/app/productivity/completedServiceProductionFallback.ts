import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Production } from "@/app/realGreen/_lib/subTypes/Production";
import { DoneBy, DoneByCore } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";
import { baseStrId, baseNumId } from "@/app/realGreen/_lib/realGreenConst";
/**
 * Returns the service's production data if it exists.
 * If the service is completed (status === "S") but has no production data,
 * synthesizes a base Production with a single DoneBy pointing to baseEmployee
 * (percent: 1.0) so that productivity selectors can always trust that
 * completed services have production data.
 *
 * For non-completed services with no production, returns null unchanged —
 * no change to existing behavior.
 *
 * This function is intentionally isolated here so that the single call-site
 * change in centralSelectors.ts is minimal and easy to revert if needed.
 */
export function getProductionOrFallback(
  service: Omit<Service, "x">,
): Production | null {
  if (service.production !== null) return service.production;

  if (service.status !== "S") return null;

  // Completed service with no production — synthesize a base Production.
  // doneDate is empty string to signal "unattributed" in the UI.
  const baseDoneByCore: DoneByCore = {
    doneById: baseNumId,
    employeeId: baseStrId,
    servId: service.servId,
    percent: 1.0,
  };

  const baseDoneBy: DoneBy = {
    ...baseDoneByCore,
    employee: { ...baseEmployee },
  };

  const baseProduction: Production = {
    // ServiceHistoryCore fields
    postedBy: "",
    feedback: "",
    minutes: 0,
    temperature: 0,
    windSpeed: 0,
    timeRange: { min: "", max: "" },
    doneDate: "",
    crewSize: 0,
    // ProductionCore fields
    servId: service.servId,
    usedAppProductCores: [],
    doneByCores: [baseDoneByCore],
    invoice: service.invoice ?? 0,
    // ProductionProps fields
    usedAppProducts: [],
    doneBys: [baseDoneBy],
    serviceDoc: service as Service,
    serviceConditions: [],
  };

  return baseProduction;
}
