"use client";

import { useSelector } from "react-redux";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { ServCodeCallAheadRow } from "./ServCodeCallAheadRow";
import { Notice } from "@/app/permission/_components/Notice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { progServCapabilities } from "@/app/realGreen/progServ/progServCapabilities";

const { can } = progServCapabilities;

export function ServCodeCallAheadTab() {
  const canReadServCodes = useSelector(userCapabilitiesSelect.allows)(can.servCodes.read);
  // Only service codes are listed here, so the program code load is skipped.
  useProgServ({
    autoLoad: true,
    canLoad: { progCodes: false, servCodes: canReadServCodes },
  });
  const servCodes = useSelector(progServSelect.servCodes);

  const sorted = [...servCodes].sort((a, b) =>
    a.servCodeId.localeCompare(b.servCodeId),
  );

  return (
    <div className="flex flex-col gap-2">
      {!canReadServCodes && (
        <Notice>You do not have access to the service codes.</Notice>
      )}
      {sorted.map((sc) => (
        <ServCodeCallAheadRow key={sc.servCodeId} servCodeId={sc.servCodeId} />
      ))}
    </div>
  );
}
