"use client";

import { useSelector } from "react-redux";
import { SelectPrograms } from "./SelectPrograms";
import { ConfigurePrograms } from "./ConfigurePrograms";
import { PrepaySelector } from "@/app/quickSend/controls/PrepaySelector";
import { progChooserSelect } from "./progChooserSelect";
import { useProgChooser } from "./useProgChooser";

export function ProgChooserControl() {
  const prepayId = useSelector(progChooserSelect.prepayId);
  const { setPrepayId } = useProgChooser();

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <PrepaySelector value={prepayId} onChange={setPrepayId} />
      </div>
      <SelectPrograms />
      <ConfigurePrograms />
    </div>
  );
}
