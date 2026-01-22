"use client";
import { useActiveCustomers } from "@/app/realGreen/customer/_lib/hooks/useActiveCustomers";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { activeCustSelectors } from "@/app/realGreen/customer/selectors";

export default function Home() {
  useActiveCustomers({ autoLoad: true });
  const dryCustomers = useSelector(activeCustSelectors.dryCustomers);
  const dryPrograms = useSelector(activeCustSelectors.dryPrograms);
  const dryServices = useSelector(activeCustSelectors.dryServices);
  useEffect(() => {
    console.log("dryCustomers", dryCustomers);
  }, [dryCustomers]);
  useEffect(() => {
    console.log("dryPrograms", dryPrograms);
  }, [dryPrograms]);
  useEffect(() => {
    console.log("dryServices", dryServices);
  }, [dryServices]);
  return (
    <div>
      <div>Hello</div>
    </div>
  );
}
