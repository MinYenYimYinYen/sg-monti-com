"use client";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/DataGrid";
import { DateRangePicker } from "@/components/DateRangePicker";

export const createServiceCodeColumns: (
  onEdit: (servCode: ServCode) => void,
) => ColumnDef<ServCode>[] = (onEdit) => [
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
      <DataGridColumnHeader column={column} title="Begin" />
    ),
    cell: ({ row }) => (
      <div>
        <DateRangePicker />
      </div>
    ),
    size: 320,
  },
  {
    accessorKey: "alwaysAsap",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"ASAP"} />
    ),
    cell: ({ row }) => <div>{row.getValue("alwaysAsap")}</div>,
    size: 80,
  },
  {
    accessorKey: "productDocs",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"Default Products"} />
    ),
    cell: ({ row }) => {
      return <div className="text-center">{row.getValue("productDocs")}</div>;
    },
    size: 200,
    meta: {
      isFluid: true,
    },
  },
];
