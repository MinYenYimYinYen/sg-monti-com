"use client";

import { EmployeePace } from "@/app/bizPlan/pace/paceSelect";
import {
  TableCell,
  TableRow,
} from "@/style/components/table";
import { cn } from "@/lib/tailwindUtils";

type Props = {
  employeePace: EmployeePace;
};

function deltaColor(delta: number): string {
  if (delta >= 0) return "text-accent";
  if (delta >= -1) return "text-secondary";
  return "text-destructive";
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

export function EmployeePaceRow({ employeePace }: Props) {
  const { employee, finishedCSP, capacityRate, requiredRate, delta } =
    employeePace;

  return (
    <TableRow className="bg-muted/30 text-xs">
      {/* indent */}
      <TableCell className="pl-8 text-muted-foreground">{employee.name}</TableCell>

      {/* Finished */}
      <TableCell>{fmt(finishedCSP.count, 0)}</TableCell>
      <TableCell>{fmt(finishedCSP.size)}</TableCell>
      <TableCell>${fmt(finishedCSP.rev)}</TableCell>

      {/* Capacity rate */}
      <TableCell>{fmt(capacityRate.count)}</TableCell>
      <TableCell>{fmt(capacityRate.size)}</TableCell>
      <TableCell>${fmt(capacityRate.rev)}</TableCell>

      {/* Required rate */}
      <TableCell>{fmt(requiredRate.count)}</TableCell>
      <TableCell>{fmt(requiredRate.size)}</TableCell>
      <TableCell>${fmt(requiredRate.rev)}</TableCell>

      {/* Delta */}
      <TableCell className={cn(deltaColor(delta.count))}>
        {delta.count >= 0 ? "+" : ""}
        {fmt(delta.count)}
      </TableCell>
      <TableCell className={cn(deltaColor(delta.size))}>
        {delta.size >= 0 ? "+" : ""}
        {fmt(delta.size)}
      </TableCell>
      <TableCell className={cn(deltaColor(delta.rev))}>
        {delta.rev >= 0 ? "+$" : "-$"}
        {fmt(Math.abs(delta.rev))}
      </TableCell>
    </TableRow>
  );
}
