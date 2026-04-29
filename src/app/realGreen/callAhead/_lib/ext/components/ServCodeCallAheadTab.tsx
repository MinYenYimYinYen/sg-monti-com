"use client";

import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { ServCodeCallAheadRow } from "./ServCodeCallAheadRow";

export function ServCodeCallAheadTab() {
  useProgServ({ autoLoad: true });
  const servCodes = useSelector(progServSelect.servCodes);

  const sorted = [...servCodes].sort((a, b) =>
    a.servCodeId.localeCompare(b.servCodeId),
  );

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((sc) => (
        <ServCodeCallAheadRow key={sc.servCodeId} servCodeId={sc.servCodeId} />
      ))}
    </div>
  );
}
