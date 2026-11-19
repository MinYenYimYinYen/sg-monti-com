import { useAppDispatch } from "@/lib/hooks/redux";
import { useSelector } from "react-redux";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import {
  priorityServiceCustomerActions,
  PIPELINE,
} from "@/app/realGreen/customer/slices/customerSlices";
import { QueryBuilder } from "@/app/realGreen/customer/mirror/QueryBuilder";

type LoadConfig = {
  loadingMsg?: string;
  force?: boolean;
  showLoading?: boolean;
  staleTime?: number;
};

function buildPriorityServiceCustomersPlan(season: number, servIds: number[]) {
  return new QueryBuilder()
    // Seed: services by specific servIds for the current season
    .addServiceStep(["entity", "provider"], {
      stepName: "getServices",
      source: "values",
      filters: [
        { field: "servId", operator: "in", value: servIds },
        { field: "season", operator: "eq", value: season },
      ],
      provides: { progId: true },
    })
    .addProgramStep(["entity", "provider"], {
      stepName: "getPrograms",
      source: "step",
      fromStep: "getServices",
      joinKey: "progId",
      filters: [],
      provides: { custId: true },
    })
    .addCustomerStep(["entity"], {
      stepName: "getCustomers",
      source: "step",
      fromStep: "getPrograms",
      joinKey: "custId",
      filters: [],
    })
    .build();
}

export function usePriorityServiceCustomers() {
  const dispatch = useAppDispatch();
  const season = useSelector(globalSettingsSelect.season);

  const loadByServIds = (servIds: number[], config?: LoadConfig) => {
    if (!season || !servIds.length) return;

    if (PIPELINE.priorityService === "mirror") {
      const plan = buildPriorityServiceCustomersPlan(season, servIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(priorityServiceCustomerActions.getDocs({ params: { plan } as any, config: config as any }));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)(priorityServiceCustomerActions.getDocs({ params: { schemeName: "byServIds", season, schemeParams: { servIds } } as any, config: config as any }));
    }
  };

  return { loadByServIds };
}
