"use client";

import { usePaceDeps } from "@/app/bizPlan/pace/usePaceDeps";
import { useSelector } from "react-redux";
import { deepSelect } from "@/app/realGreen/deepSelect";

export function Pace() {
  usePaceDeps();
  const servCodeMap = useSelector(deepSelect.servCodeMap);
  console.log(servCodeMap);
  return (
    <div>
      <div></div>
    </div>
  );
}
