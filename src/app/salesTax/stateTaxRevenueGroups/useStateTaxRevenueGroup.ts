import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { stateTaxRevenueGroupActions } from "@/app/salesTax/stateTaxRevenueGroups/stateTaxRevenueGroupSlice";

/** The layout loads with `autoLoad`; a child that only edits groups passes `autoLoad: false`. */
export function useStateTaxRevenueGroup({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        stateTaxRevenueGroupActions.getAllStateTaxRevenueGroups({
          params: {},
          config: {
            loadingMsg: "Loading revenue groups...",
            staleTime: realGreenConst.paramTypesCacheTime,
          },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const createGroup = ({ mnTaxCode }: { mnTaxCode: string }) => {
    dispatch(
      stateTaxRevenueGroupActions.createStateTaxRevenueGroup({
        params: { mnTaxCode },
        config: { loadingMsg: "Creating revenue group...", successMsg: "Revenue group created" },
      }),
    );
  };

  const joinGroup = ({
    mnTaxCode,
    revenueGroupKey,
  }: {
    mnTaxCode: string;
    revenueGroupKey: string;
  }) => {
    dispatch(
      stateTaxRevenueGroupActions.joinStateTaxRevenueGroup({
        params: { mnTaxCode, revenueGroupKey },
        config: { loadingMsg: "Adding to revenue group..." },
      }),
    );
  };

  const leaveGroup = ({ mnTaxCode }: { mnTaxCode: string }) => {
    dispatch(
      stateTaxRevenueGroupActions.leaveStateTaxRevenueGroup({
        params: { mnTaxCode },
        config: { loadingMsg: "Removing from revenue group..." },
      }),
    );
  };

  return { createGroup, joinGroup, leaveGroup };
}
