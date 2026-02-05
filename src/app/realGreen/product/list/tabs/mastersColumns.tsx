"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ProductMasterDoc } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { DataGridColumnHeader } from "@/components/DataGrid";
import { Button } from "@/style/components/button";
import { Pencil } from "lucide-react";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

// Masters Table Columns
export const mastersColumns: (
  onEdit?: (master: ProductMasterDoc) => void,
) => ColumnDef<ProductMasterDoc>[] = (onEdit) => [
  {
    accessorKey: "productCode",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Product Code" />
    ),
    cell: ({ row }) => <div>{row.getValue("productCode")}</div>,
    size: 150,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => <div>{row.getValue("description")}</div>,
    enableColumnFilter: true,
    filterFn: "includesString",
    size: 400,
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => (
      <div>
        {row.original.category === baseStrId
          ? row.original.categoryId
          : row.original.category}
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "subProductIds",
    header: "Subs",
    cell: ({ row }) => {
      const subProductIds = row.getValue("subProductIds") as number[];
      return <div className="text-center">{subProductIds.length}</div>;
    },
    enableSorting: false,
    size: 80,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation(); // Prevent row expansion when clicking edit
          onEdit?.(row.original);
        }}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    ),
    enableSorting: false,
    size: 90,
  },
];
