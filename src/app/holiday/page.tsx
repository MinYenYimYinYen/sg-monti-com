"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Plus, CalendarDays } from "lucide-react";
import { Container } from "@/components/Containers";
import { Button } from "@/style/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/style/components/card";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import { ScrollArea } from "@/style/components/scroll-area";
import { Separator } from "@/style/components/separator";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FormGroup } from "@/components/FormGroup";
import { useHoliday } from "@/app/holiday/useHoliday";
import { holidaySelect } from "@/app/holiday/holidaySelect";
import { holidayActions } from "@/app/holiday/holidaySlice";
import { Holiday } from "@/app/holiday/holidayTypes";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { cn } from "@/style/utils";
import { format, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRange(dateRange: TRange<string>): string {
  const fmt = (iso: string) => {
    try {
      return format(parseISO(iso), "M/d/yyyy");
    } catch {
      return iso;
    }
  };
  if (dateRange.min === dateRange.max) return fmt(dateRange.min);
  return `${fmt(dateRange.min)} – ${fmt(dateRange.max)}`;
}

// ---------------------------------------------------------------------------
// HolidayListItem
// ---------------------------------------------------------------------------

function HolidayListItem({
  holiday,
  isSelected,
  onClick,
}: {
  holiday: Holiday;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md border px-3 py-2 text-sm transition-colors",
        isSelected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:bg-accent/10 text-foreground",
      )}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <CalendarDays className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium truncate">{holiday.description}</span>
      </div>
      <div className="text-xs text-muted-foreground pl-5">
        {formatDateRange(holiday.dateRange)}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// HolidayForm
// ---------------------------------------------------------------------------

function HolidayForm({
  existingDoc,
  onDone,
}: {
  existingDoc?: Holiday;
  onDone: () => void;
}) {
  const dispatch = useAppDispatch();

  const [description, setDescription] = useState(existingDoc?.description ?? "");
  const [dateRange, setDateRange] = useState<TRange<string>>(
    existingDoc?.dateRange ?? { min: "", max: "" },
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!existingDoc;

  const canSave =
    description.trim() !== "" &&
    dateRange.min !== "" &&
    dateRange.max !== "" &&
    dateRange.min <= dateRange.max;

  const handleSave = async () => {
    if (!canSave) return;

    const doc: Holiday = {
      holidayId: existingDoc?.holidayId ?? crypto.randomUUID(),
      description: description.trim(),
      dateRange,
      createdAt: existingDoc?.createdAt ?? "",
      updatedAt: existingDoc?.updatedAt ?? "",
    };

    setSaveStatus("saving");
    await dispatch(
      holidayActions.upsert({ params: { doc }, config: { force: true } }),
    );
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
    onDone();
  };

  const handleDelete = async () => {
    if (!existingDoc) return;
    await dispatch(
      holidayActions.deleteOne({
        params: { holidayId: existingDoc.holidayId },
        config: { force: true },
      }),
    );
    onDone();
  };

  return (
    <CardContent className="pt-4">
      <div className="space-y-3">
        <FormGroup>
          <Label>Description</Label>
          <Input
            placeholder="e.g. Thanksgiving, Christmas…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Date Range</Label>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <p className="text-[10px] text-muted-foreground">
            For a single day, set both dates to the same value.
          </p>
        </FormGroup>

        <div className="flex gap-2 items-center">
          <SaveButton
            disabled={!canSave}
            status={saveStatus}
            onClick={handleSave}
            onSuccessComplete={handleSuccessComplete}
          >
            Save
          </SaveButton>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>

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
                Delete Holiday
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Are you sure? This will permanently remove this holiday.
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
    </CardContent>
  );
}

// ---------------------------------------------------------------------------
// HolidayPage
// ---------------------------------------------------------------------------

export default function HolidayPage() {
  useHoliday({ autoLoad: true });

  const holidays = useSelector(holidaySelect.all);
  const [selected, setSelected] = useState<string | "new" | null>(null);

  const selectedHoliday =
    typeof selected === "string" && selected !== "new"
      ? holidays.find((h) => h.holidayId === selected) ?? null
      : null;

  const handleDone = () => setSelected(null);

  // Sort holidays by dateRange.min ascending
  const sortedHolidays = [...holidays].sort((a, b) =>
    a.dateRange.min.localeCompare(b.dateRange.min),
  );

  return (
    <Container variant="scroll-shell" title="Holidays">
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left panel: list */}
        <div className="w-[360px] shrink-0 flex flex-col gap-2">
          <Button
            variant="primary"
            intensity="soft"
            className="w-full justify-start gap-2"
            onClick={() => setSelected("new")}
          >
            <Plus className="w-4 h-4" />
            New Holiday
          </Button>

          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-1">
              {sortedHolidays.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-1 py-2">
                  No holidays yet.
                </p>
              )}
              {sortedHolidays.map((holiday) => (
                <HolidayListItem
                  key={holiday.holidayId}
                  holiday={holiday}
                  isSelected={selected === holiday.holidayId}
                  onClick={() => setSelected(holiday.holidayId)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right panel: form */}
        <div className="flex-1 min-w-0">
          {selected === null && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select a holiday to edit, or click &#34;New Holiday&#34; to add one.
            </div>
          )}

          {selected === "new" && (
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Add Holiday</CardTitle>
                <CardDescription>
                  Create a company-wide holiday that applies to all employees.
                </CardDescription>
              </CardHeader>
              <HolidayForm key="new" onDone={handleDone} />
            </Card>
          )}

          {typeof selected === "string" && selected !== "new" && selectedHoliday && (
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>{selectedHoliday.description}</CardTitle>
                <CardDescription>
                  {formatDateRange(selectedHoliday.dateRange)}
                </CardDescription>
              </CardHeader>
              <HolidayForm
                key={selected}
                existingDoc={selectedHoliday}
                onDone={handleDone}
              />
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
