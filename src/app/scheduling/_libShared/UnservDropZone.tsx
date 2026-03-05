"use client";
import { useViewport } from "@/lib/hooks/useViewport";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useCSV } from "@/app/csv/_lib/useCSV";
import { CSVDropzone } from "@/components/dropZone/dropZone";

export function UnservDropZone() {
  const { isNarrow } = useViewport();
  const role = useSelector(authSelect.role);
  const canUpload = ["admin", "office"].includes(role ?? "");
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
