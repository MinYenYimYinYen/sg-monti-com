"use client";

import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { ToggleGroup, ToggleGroupItem } from "@/style/components/toggle-group";

const FILTER_OPTIONS: { value: PaceCategory; label: string }[] = [
  { value: "asap", label: "ASAP" },
  { value: "overdue", label: "Overdue" },
  { value: "inProgress", label: "In Progress" },
  { value: "notStarted", label: "Not Started" },
  { value: "notSet", label: "Not Set" },
];

type EmployeePaceListPanelProps = {
  visibleCategories: PaceCategory[];
  onVisibleCategoriesChange: (categories: PaceCategory[]) => void;
};

export function EmployeePaceListPanel({
  visibleCategories,
  onVisibleCategoriesChange,
}: EmployeePaceListPanelProps) {
  function handleFilterChange(values: string[]) {
    onVisibleCategoriesChange(values as PaceCategory[]);
  }

  return (
    <div className="w-40 shrink-0 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Show rows
      </p>
      <ToggleGroup
        type="multiple"
        value={visibleCategories}
        onValueChange={handleFilterChange}
        className="flex-col items-start gap-1"
        variant="outline"
        size="sm"
      >
        {FILTER_OPTIONS.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="w-full justify-start h-7 text-xs"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
