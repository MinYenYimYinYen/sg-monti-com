"use client";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/DataGrid";

export const createServiceCodeColumns: (
  onEdit: (servCode: ServCode) => void,
) => ColumnDef<ServCode>[] = (onEdit) => [
  {
    accessorKey: "servCodeId",
    header: ({ column }) => <DataGridColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <div>{row.getValue("servCodeId")}</div>,
    size: 10,
  },
  {
    accessorKey: "progCodeId",
    header: ({column}) => <DataGridColumnHeader column={column} title={"Program"} />,
    cell: ({row}) => <div>{row.getValue("progCodeId")}</div>,
    size: 10,
  },
  {
    accessorKey: "isSpecial",
    header: ({column}) => <DataGridColumnHeader column={column} title={"Special"} />,
    cell: ({row}) => <div>{row.getValue("isSpecial") ? "Special" : "Program"}</div>,
    size: 10,
  },

  {
    accessorKey: "begin",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Begin" />
    ),
    cell: ({ row }) => <div>{row.getValue("begin")}</div>,
    size: 20,
  },
  {
    accessorKey: "end",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"End"} />
    ),
    cell: ({ row }) => <div>{row.getValue("end")}</div>,
    size: 20,
  },
  {
    accessorKey: "alwaysAsap",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"ASAP"} />
    ),
    cell: ({ row }) => <div>{row.getValue("alwaysAsap")}</div>,
    size: 20,
  },
  {
    accessorKey: "productDocs",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title={"Default Products"} />
    ),
    cell: ({ row }) => {
      return <div className="text-center">{row.getValue("productDocs")}</div>;
    },
    size: 20,
  },
];
