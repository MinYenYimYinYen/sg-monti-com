"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { paceSelect, ServCodePace } from "@/app/bizPlan/pace/paceSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { assignmentPlanSelect } from "@/app/bizPlan/assignmentPlan/assignmentPlanSelect";
import { useAssignmentPlan } from "@/app/bizPlan/assignmentPlan/useAssignmentPlan";
import { EmployeePaceRow } from "@/app/bizPlan/pace/EmployeePaceRow";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { Button } from "@/style/components/button";
import EntitySelector from "@/components/EntitySelector";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/tailwindUtils";

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

function ServCodeRow({ pace }: { pace: ServCodePace }) {
  const [expanded, setExpanded] = useState(false);
  const { upsert } = useAssignmentPlan({ autoLoad: false });

  const allEmployees = useSelector(employeeSelect.employees);
  const assignmentsByServCodeId = useSelector(
    assignmentPlanSelect.assignmentsByServCodeId,
  );

  const currentPlan = assignmentsByServCodeId.get(pace.servCode.servCodeId);
  const currentEmployeeIds = currentPlan?.employeeIds ?? [];

  const availableEmployees = allEmployees.filter(
    (e) => e.active && !currentEmployeeIds.includes(e.employeeId),
  );

  const handleAddEmployee = (_id: string, employee: { employeeId: string; name: string }) => {
    upsert({
      servCodeId: pace.servCode.servCodeId,
      employeeIds: [...currentEmployeeIds, employee.employeeId],
    });
  };

  const handleRemoveEmployee = (employeeId: string) => {
    upsert({
      servCodeId: pace.servCode.servCodeId,
      employeeIds: currentEmployeeIds.filter((id) => id !== employeeId),
    });
  };

  const hasEmployees = pace.employeePaces.length > 0;

  return (
    <>
      <TableRow
        variant="expandable"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <TableCell>
          <div className="flex items-center gap-1">
            {hasEmployees ? (
              expanded ? (
                <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
              )
            ) : (
              <span className="size-3 shrink-0" />
            )}
            <span className="font-medium">{pace.servCode.servCodeId}</span>
            <span className="ml-1 truncate text-xs text-muted-foreground">
              {pace.servCode.longName}
            </span>
          </div>
        </TableCell>

        {/* Days remaining */}
        <TableCell>{pace.daysRemaining}</TableCell>

        {/* Unfinished */}
        <TableCell>{fmt(pace.unfinishedCSP.count, 0)}</TableCell>
        <TableCell>{fmt(pace.unfinishedCSP.size)}</TableCell>
        <TableCell>${fmt(pace.unfinishedCSP.rev)}</TableCell>

        {/* Required rate */}
        <TableCell>{fmt(pace.unfinishedRate.count)}</TableCell>
        <TableCell>{fmt(pace.unfinishedRate.size)}</TableCell>
        <TableCell>${fmt(pace.unfinishedRate.rev)}</TableCell>

        {/* Actual rate */}
        <TableCell>{fmt(pace.finishedRate.count)}</TableCell>
        <TableCell>{fmt(pace.finishedRate.size)}</TableCell>
        <TableCell>${fmt(pace.finishedRate.rev)}</TableCell>

        {/* Overall delta */}
        {(() => {
          const delta = pace.finishedRate.count - pace.unfinishedRate.count;
          return (
            <TableCell
              className={cn(
                delta >= 0 ? "text-accent" : delta >= -1 ? "text-secondary" : "text-destructive",
              )}
            >
              {delta >= 0 ? "+" : ""}
              {fmt(delta)}
            </TableCell>
          );
        })()}
      </TableRow>

      {expanded && (
        <>
          {pace.employeePaces.map((ep) => (
            <EmployeePaceRow key={ep.employee.employeeId} employeePace={ep} />
          ))}

          {/* Assignment management row */}
          <TableRow className="bg-muted/20">
            <TableCell colSpan={13} onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-wrap items-center gap-2 pl-8">
                {pace.servCode.assignedTo.map((employee) => (
                  <div
                    key={employee.employeeId}
                    className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
                  >
                    <span>{employee.name}</span>
                    <button
                      onClick={() => handleRemoveEmployee(employee.employeeId)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}

                {availableEmployees.length > 0 && (
                  <div className="w-40">
                    <EntitySelector
                      items={availableEmployees}
                      getItemId={(e) => e.employeeId}
                      getItemLabel={(e) => e.name}
                      placeholder="Add employee..."
                      onValueChange={handleAddEmployee}
                    />
                  </div>
                )}

                <Button
                  variant="outline"
                  intensity="ghost"
                  size="sm"
                  onClick={() => {
                    const fngCount = currentEmployeeIds.filter((id) =>
                      id.startsWith("FNG-"),
                    ).length;
                    upsert({
                      servCodeId: pace.servCode.servCodeId,
                      employeeIds: [
                        ...currentEmployeeIds,
                        `FNG-${fngCount + 1}`,
                      ],
                    });
                  }}
                >
                  <Plus className="size-3" />
                  Add Fictional
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </>
      )}
    </>
  );
}

export function PaceTable() {
  const paceRows = useSelector(paceSelect.servCodePaceRows);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service Code</TableHead>
          <TableHead>Days Left</TableHead>
          <TableHead>Remaining #</TableHead>
          <TableHead>Remaining Sz</TableHead>
          <TableHead>Remaining Rev</TableHead>
          <TableHead>Req Rate #</TableHead>
          <TableHead>Req Rate Sz</TableHead>
          <TableHead>Req Rate Rev</TableHead>
          <TableHead>Act Rate #</TableHead>
          <TableHead>Act Rate Sz</TableHead>
          <TableHead>Act Rate Rev</TableHead>
          <TableHead>Δ #/day</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paceRows.map((pace) => (
          <ServCodeRow key={pace.servCode.servCodeId} pace={pace} />
        ))}
        {paceRows.length === 0 && (
          <TableRow>
            <TableCell colSpan={12} className="text-center text-muted-foreground">
              No active service codes found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
