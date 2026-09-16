"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/style/components/sheet";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { DatePicker } from "@/components/DatePicker";
import { FormGroup } from "@/components/FormGroup";
import { Separator } from "@/style/components/separator";
import { useEmployeeAvailability } from "@/app/employeeAvailability/useEmployeeAvailability";
import { employeeAvailabilitySelect } from "@/app/employeeAvailability/employeeAvailabilitySelect";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

// ---------------------------------------------------------------------------
// EmployeeAvailabilitySheet
// ---------------------------------------------------------------------------

type EmployeeAvailabilitySheetProps = {
  employee: Employee;
  onClose: () => void;
};

export function EmployeeAvailabilitySheet({
  employee,
  onClose,
}: EmployeeAvailabilitySheetProps) {
  const { upsert, deleteOne } = useEmployeeAvailability();
  const availabilityByEmployeeId = useSelector(employeeAvailabilitySelect.byEmployeeId);
  const existingDoc = availabilityByEmployeeId.get(employee.employeeId);

  const [startDate, setStartDate] = useState<string>(existingDoc?.startDate ?? "");
  const [endDate, setEndDate] = useState<string>(existingDoc?.endDate ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasExistingDoc = !!existingDoc;
  const hasAnyConstraint = startDate !== "" || endDate !== "";

  const handleSave = async () => {
    setSaveStatus("saving");
    await upsert({
      employeeId: employee.employeeId,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    });
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
    onClose();
  };

  const handleDelete = async () => {
    await deleteOne(employee.employeeId);
    onClose();
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px]">
        <SheetHeader>
          <SheetTitle>{employee.name}</SheetTitle>
          <SheetDescription>
            Availability Constraints — days outside this window will not be counted as workable in the paceCrawler.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Start Date */}
          <FormGroup>
            <Label>Start Date</Label>
            <DatePicker
              value={startDate}
              onChange={(d) => setStartDate(d ?? "")}
              placeholder="No restriction"
            />
            <p className="text-[10px] text-muted-foreground">
              Days before this date will not be counted as workable. Leave blank for no restriction.
            </p>
          </FormGroup>

          {/* End Date */}
          <FormGroup>
            <Label>End Date</Label>
            <DatePicker
              value={endDate}
              onChange={(d) => setEndDate(d ?? "")}
              placeholder="No restriction"
            />
            <p className="text-[10px] text-muted-foreground">
              Days after this date will not be counted as workable. Leave blank for no restriction.
            </p>
          </FormGroup>

          {/* Actions */}
          <div className="flex gap-2 items-center">
            <SaveButton
              status={saveStatus}
              onClick={handleSave}
              onSuccessComplete={handleSuccessComplete}
            >
              Save
            </SaveButton>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          {/* Delete (only when a record exists) */}
          {hasExistingDoc && (
            <>
              <Separator className="my-2" />
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  intensity="soft"
                  className="w-full"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Remove All Constraints
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    This will remove all availability constraints for {employee.name}, restoring full availability.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDelete}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Current constraints summary */}
          {(existingDoc?.startDate || existingDoc?.endDate) && (
            <div className="rounded-md bg-accent/10 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Current constraints:</p>
              {existingDoc.startDate && (
                <p>Start: <span className="font-mono text-foreground">{existingDoc.startDate}</span></p>
              )}
              {existingDoc.endDate && (
                <p>End: <span className="font-mono text-foreground">{existingDoc.endDate}</span></p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
