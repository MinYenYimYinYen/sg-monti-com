import { LoadoutFeedback } from "@/app/scheduling/dailyInventory/loadoutFeedback/LoadoutFeedback";
import { LoadoutActuals, LoadoutFinal } from "@/app/loadout/LoadoutTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

/**
 * One entry per finished loadout (employeeId × routeDate pair).
 * Preserves all source data for full drilldown capability.
 */
export type LoadoutReportEntry = {
  employeeId: string;
  routeDate: string;
  loadout: LoadoutFinal;
  completedServices: Service[];
  actuals: LoadoutActuals;
  feedback: LoadoutFeedback;
};
