"use client";

import { useSelector } from "react-redux";
import { DataGrid } from "@/components/DataGrid/DataGrid";
import { reliabilitySelect } from "@/app/productivity/reliabilitySelect";
import { reliabilityColumns } from "@/app/productivity/_columns/reliabilityColumns";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";

export default function ReliabilityPage() {
  useCallAhead({autoLoad: true})

  const rows = useSelector(reliabilitySelect.reliabilityRows);
  const sorted = [...rows].sort(
    (a, b) => (b.reliability.unplannedAbsenceCount) - (a.reliability.unplannedAbsenceCount),
  );

  return (
    <div className="flex-1 overflow-auto p-4">
      <DataGrid
        data={sorted}
        columns={reliabilityColumns}
        enableSorting
        enablePagination={false}
        enableColumnVisibility
        rowVariant="alternating"
      />
    </div>
  );
}
