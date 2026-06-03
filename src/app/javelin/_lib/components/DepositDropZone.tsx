"use client";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CSVDropzone } from "@/components/dropZone/dropZone";
import { parseDeposit } from "@/app/csv/deposits/depositParser";
import { depositActions } from "@/app/javelin/depositSlice";

export function DepositDropZone() {
  const dispatch = useAppDispatch();

  const handleFileDrop = async (file: File) => {
    const parseResult = await parseDeposit(file);

    if (!parseResult.success) {
      dispatch(depositActions.setRows([]));
      dispatch(depositActions.setFileName(file.name));
      dispatch(depositActions.setErrors(parseResult.errors));
      dispatch(depositActions.setWarnings([]));
      return;
    }

    dispatch(depositActions.setRows(parseResult.data));
    dispatch(depositActions.setFileName(file.name));
    dispatch(depositActions.setErrors([]));
    dispatch(depositActions.setWarnings(parseResult.warnings ?? []));
  };

  return (
    <div className="mb-4">
      <p className="text-sm text-muted-foreground mb-2">
        Drop the deposit CSV exported from the CRM credit card processing system.
      </p>
      <CSVDropzone
        multiple={false}
        onFileDrop={handleFileDrop}
        className="h-32"
      />
    </div>
  );
}
