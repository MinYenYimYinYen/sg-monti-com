"use client";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/DataGrid";
import {
  EditAlwaysAsap,
  EditServCodeDates,
} from "@/app/realGreen/progServ/_lib/components/servCodeEditor/servCodeEditor";
import { Pencil } from "lucide-react";
import { Button } from "@/style/components/button";

export const createServiceCodeColumns: (
  setEditServCodeId: (servCodeId: string) => void,
) => ColumnDef<ServCode>[] = (setEditServCodeId) => [
  {
    accessorKey: "servCodeId",
    header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <div>{row.getValue("servCodeId")}</div>,
    size: 80,
  },
  {
    accessorKey: "progCodeId",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"Program"} />
    ),
    cell: ({ row }) => <div>{row.getValue("progCodeId")}</div>,
    size: 80,
  },
  {
    accessorKey: "isSpecial",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"Special"} />
    ),
    cell: ({ row }) => (
      <div>{row.getValue("isSpecial") ? "Special" : "Program"}</div>
    ),
    size: 100,
  },
  {
    accessorKey: "dateRange",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Date Range" />
    ),
    cell: ({ row }) => (
      <EditServCodeDates servCodeId={row.original.servCodeId} />
    ),
    size: 320,
  },
  {
    accessorKey: "alwaysAsap",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"ASAP"} />
    ),
    cell: ({ row }) => <EditAlwaysAsap servCodeId={row.original.servCodeId} />,
    size: 80,
  },
  {
    accessorKey: "productDocs",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"Default Products"} />
    ),
    cell: ({ row }) => {
      const ruleCount = row.original.productRuleDocs.length;
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {ruleCount} {ruleCount === 1 ? "Rule" : "Rules"}
          </span>
          <Button
            variant="primary"
            intensity="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setEditServCodeId(row.original.servCodeId)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      );
    },
    size: 200,
    meta: {
      isFluid: true,
    },
  },
];
