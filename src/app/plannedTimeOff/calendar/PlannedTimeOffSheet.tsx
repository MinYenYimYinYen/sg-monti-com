"use client";

import { useState } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/style/components/sheet";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FormGroup } from "@/components/FormGroup";
import { Separator } from "@/style/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { plannedTimeOffActions } from "@/app/plannedTimeOff/plannedTimeOffSlice";
import { PlannedTimeOff } from "@/app/plannedTimeOff/plannedTimeOffTypes";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";

// ---------------------------------------------------------------------------
// PlannedTimeOffSheet
// ---------------------------------------------------------------------------

type PlannedTimeOffSheetProps = {
  defaultDate: string;
  existingDoc?: PlannedTimeOff;
  employees: Employee[];
  onClose: () => void;
};

export function PlannedTimeOffSheet({
  defaultDate,
  existingDoc,
  employees,
  onClose,
}: PlannedTimeOffSheetProps) {
  const dispatch = useAppDispatch();

  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    existingDoc?.employeeId ?? "",
  );
  const [dateRange, setDateRange] = useState<TRange<string>>(
    existingDoc?.dateRange ?? { min: defaultDate, max: defaultDate },
  );
  const [note, setNote] = useState(existingDoc?.note ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!existingDoc;

  // Filter employees by search (case-insensitive match on name or employeeId)
  const filteredEmployees = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q);
  });

  const canSave =
    selectedEmployeeId !== "" &&
    dateRange.min !== "" &&
    dateRange.max !== "" &&
    dateRange.min <= dateRange.max;

  const handleSave = async () => {
    if (!canSave) return;

    const doc: PlannedTimeOff = {
      plannedTimeOffId: existingDoc?.plannedTimeOffId ?? crypto.randomUUID(),
      employeeId: selectedEmployeeId,
      dateRange,
      note,
      createdAt: existingDoc?.createdAt ?? "",
      updatedAt: existingDoc?.updatedAt ?? "",
    };

    setSaveStatus("saving");
    await dispatch(
      plannedTimeOffActions.upsert({ params: { doc }, config: { force: true } }),
    );
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
    onClose();
  };

  const handleDelete = async () => {
    if (!existingDoc) return;
    await dispatch(
      plannedTimeOffActions.deleteOne({
        params: { plannedTimeOffId: existingDoc.plannedTimeOffId },
        config: { force: true },
      }),
    );
    onClose();
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>{isEditMode ? "Edit Time Off" : "Add Time Off"}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? "Update or remove this planned time off entry."
              : "Schedule planned time off for an employee."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Employee search + select */}
          <FormGroup>
            <Label>Employee</Label>
            <Input
              placeholder="Search by name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-1"
            />
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={isEditMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee…" />
              </SelectTrigger>
              <SelectContent>
                {filteredEmployees.map((employee) => (
                  <SelectItem key={employee.employeeId} value={employee.employeeId}>
                    {employee.name}
                  </SelectItem>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No employees match
                  </div>
                )}
              </SelectContent>
            </Select>
          </FormGroup>

          {/* Date range */}
          <FormGroup>
            <Label>Date Range</Label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <p className="text-[10px] text-muted-foreground">
              For a single day, set both dates to the same value.
            </p>
          </FormGroup>

          {/* Note */}
          <FormGroup>
            <Label>Note</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="Optional note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormGroup>

          {/* Actions */}
          <div className="flex gap-2 items-center">
            <SaveButton
              disabled={!canSave}
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

          {/* Delete (edit mode only) */}
          {isEditMode && (
            <>
              <Separator className="my-2" />
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  intensity="soft"
                  className="w-full"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Remove Time Off
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Are you sure? This will permanently remove this time off entry.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDelete}
                    >
                      Confirm Delete
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
