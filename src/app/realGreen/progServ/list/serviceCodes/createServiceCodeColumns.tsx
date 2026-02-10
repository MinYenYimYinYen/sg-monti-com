"use client";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/DataGrid";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  EditAlwaysAsap,
  EditServCodeDates,
} from "@/app/realGreen/progServ/_lib/components/servCodeEditor/servCodeEditor";
import {Pencil} from "lucide-react";

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
      return <div className="text-center flex justify-center">
        <Pencil 
          className={"h-4 w-4 cursor-pointer hover:text-primary transition-colors"} 
          onClick={() => setEditServCodeId(row.original.servCodeId)}
        />
      </div>;
    },
    size: 200,
    meta: {
      isFluid: true,
    },
  },
];
