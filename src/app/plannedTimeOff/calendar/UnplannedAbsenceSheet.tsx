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
import { DatePicker } from "@/components/DatePicker";
import { FormGroup } from "@/components/FormGroup";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { plannedTimeOffActions } from "@/app/plannedTimeOff/plannedTimeOffSlice";
import { Employee } from "@/app/realGreen/employee/types/EmployeeTypes";

// ---------------------------------------------------------------------------
// UnplannedAbsenceSheet
// ---------------------------------------------------------------------------

type UnplannedAbsenceSheetProps = {
  defaultDate: string;
  employees: Employee[];
  onClose: () => void;
};

export function UnplannedAbsenceSheet({
  defaultDate,
  employees,
  onClose,
}: UnplannedAbsenceSheetProps) {
  const dispatch = useAppDispatch();

  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Filter employees by search (case-insensitive match on name or employeeId)
  const filteredEmployees = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q);
  });

  const canSave =
    selectedEmployeeId !== "" &&
    date !== "" &&
    note.trim() !== "";

  const handleSave = async () => {
    if (!canSave) return;

    setSaveStatus("saving");
    await dispatch(
      plannedTimeOffActions.upsert({
        params: {
          doc: {
            plannedTimeOffId: crypto.randomUUID(),
            employeeId: selectedEmployeeId,
            requestType: "unplannedAbsence",
            dateRange: { min: date, max: date },
            timeRange: null,
            note: note.trim(),
            createdAt: "",
            updatedAt: "",
          },
        },
        config: { force: true },
      }),
    );
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
    onClose();
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
        <SheetHeader className="bg-destructive/30 -mx-6 -mt-6 px-6 pt-6 pb-4 mb-6 rounded-t-lg">
          <SheetTitle className="text-destructive">Record Unplanned Absence</SheetTitle>
          <SheetDescription className="text-destructive/70">
            This records an absence that was not pre-approved. A note is required.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
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

          {/* Single date */}
          <FormGroup>
            <Label>Date</Label>
            <DatePicker
              value={date}
              onChange={(d) => { if (d) setDate(d); }}
            />
            <p className="text-[10px] text-muted-foreground">
              Unplanned absences are always a single day.
            </p>
          </FormGroup>

          {/* Note (required) */}
          <FormGroup>
            <Label>
              Note <span className="text-destructive">*</span>
            </Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="e.g. Called in sick at 7am, no prior notice…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Required — describe the circumstances of the absence.
            </p>
          </FormGroup>

          {/* Actions */}
          <div className="flex gap-2 items-center">
            <SaveButton
              disabled={!canSave}
              status={saveStatus}
              onClick={handleSave}
              onSuccessComplete={handleSuccessComplete}
            >
              Record Absence
            </SaveButton>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
