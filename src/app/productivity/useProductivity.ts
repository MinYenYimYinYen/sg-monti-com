"use client";

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useActiveCustomers } from "@/app/realGreen/customer/hooks/useActiveCustomers";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useTimeCard } from "@/app/timeCard/useTimeCard";
import { assignmentActions } from "@/app/assignment/assignmentSlice";
import { productivitySelect } from "@/app/productivity/productivitySelect";
import { dateRanges } from "@/lib/primatives/dates/dateStrings";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";

export function useProductivity() {
  useActiveCustomers({ autoLoad: true });
  useCustomerContext({ contexts: ["active"] });
  useProgServ({autoLoad: true})

  const dispatch = useAppDispatch();
  const doneDateRange = useSelector(productivitySelect.doneDateRange);
  const isValidRange = dateRanges.isValidDateRange(doneDateRange);

  useEffect(() => {
    if (!isValidRange) return;
    dispatch(
      assignmentActions.getBySchedDateRange({
        params: { dateRange: doneDateRange },
        config: { loadingMsg: "Loading assignments..." },
      }),
    );
  }, [dispatch, doneDateRange, isValidRange]);

  useTimeCard({ dateRange: isValidRange ? doneDateRange : undefined });
}
