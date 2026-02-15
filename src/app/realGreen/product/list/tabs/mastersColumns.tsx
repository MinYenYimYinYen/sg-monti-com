"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/DataGrid";
import { Button } from "@/style/components/button";
import { Pencil } from "lucide-react";
import {
  ProductMaster,
  SubProductConfigDoc,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";

export const createMastersColumns: (
  onEdit: (master: ProductMaster) => void,
  onEditCategory: (categoryId: number, categoryName: string) => void,
  onEditUnit: (unit: Unit) => void,
) => ColumnDef<ProductMaster>[] = (onEdit, onEditCategory, onEditUnit) => [
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
      <div className={"flex items-center gap-2"}>
        <span>{row.original.category}</span>
        <Button
          variant={"outline"}
          size={"icon"}
          onClick={(e) => {
            e.stopPropagation();

            onEditCategory?.(row.original.categoryId, row.original.category);
          }}
        >
          <Pencil />
        </Button>
      </div>
    ),
    size: 180,
  },
  {
    accessorKey: "unit",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Unit" />
    ),
    cell: ({ row }) => (
      <div className={"flex items-center gap-2"}>
        <span>{row.original.unit.desc}</span>
        <Button
          variant={"outline"}
          size={"icon"}
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onEditUnit?.(row.original.unit);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    ),
  },
  {
    accessorKey: "subProductConfigs",
    header: "Subs",
    cell: ({ row }) => {
      const subProductIds = row.getValue("subProductConfigs") as SubProductConfigDoc[];
      return <div className="text-center">{subProductIds.length}</div>;
    },
    enableSorting: false,
    size: 80,
  },
  {
    id: "editSubs",
    header: "Edit Subs",
    cell: ({ row }) => (
      <Button
        variant="outline"
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
