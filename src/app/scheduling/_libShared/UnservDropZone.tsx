"use client";
import { useViewport } from "@/lib/hooks/useViewport";
import { useSelector } from "react-redux";
import { useCSV } from "@/app/csv/_lib/useCSV";
import { CSVDropzone } from "@/components/dropZone/dropZone";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

export function UnservDropZone() {
  const { isNarrow } = useViewport();
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canUpload = allows(can.serviceAssignments.write);
  const { parseAssignments } = useCSV();

  if (!canUpload || isNarrow) {
    return null;
  }

  return (
    <section>
      <h2 className={"text-lg font-medium"}>Upload Unserviced Report</h2>
      <CSVDropzone onFileDrop={(file) => parseAssignments(file)} />
    </section>
  );
}
