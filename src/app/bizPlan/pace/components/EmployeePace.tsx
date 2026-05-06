"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { usePaceDeps } from "@/app/bizPlan/pace/usePaceDeps";
import { paceSelect } from "@/app/bizPlan/pace/paceSelect";
import { PaceCategory } from "@/app/bizPlan/pace/PaceType";
import { EmployeePaceListPanel } from "@/app/bizPlan/pace/components/EmployeePaceListPanel";
import { EmployeeCard } from "@/app/bizPlan/pace/components/EmployeeCard";

const ALL_CATEGORIES: PaceCategory[] = [
  "asap",
  "overdue",
  "inProgress",
  "notStarted",
  "notSet",
];

export function EmployeePace() {
  usePaceDeps();

  const employeeCardData = useSelector(paceSelect.employeeCardData);
  const [visibleCategories, setVisibleCategories] =
    useState<PaceCategory[]>(ALL_CATEGORIES);

  return (
    <div className="flex gap-4 h-full p-4">
      {/* Left panel — category filter */}
      <EmployeePaceListPanel
        visibleCategories={visibleCategories}
        onVisibleCategoriesChange={setVisibleCategories}
      />

      {/* Card grid */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {employeeCardData.length === 0 ? (
          <div className="flex items-center justify-center h-full border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground text-sm">
              No employees have assignments yet
            </p>
          </div>
        ) : (
          <div className="flex flex-row flex-wrap gap-4 content-start">
            {employeeCardData.map((cardData) => (
              <EmployeeCard
                key={cardData.employee.employeeId}
                cardData={cardData}
                visibleCategories={visibleCategories}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
