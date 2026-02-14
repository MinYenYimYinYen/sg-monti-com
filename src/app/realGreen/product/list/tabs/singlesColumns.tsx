import { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/DataGrid";
import { Button } from "@/style/components/button";
import { Pencil } from "lucide-react";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";

import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";

export const createSinglesColumns = (
  onEditCategory: (categoryId: number, categoryName: string) => void,
  onEditUnit: (unit: Unit) => void,
): ColumnDef<ProductSingle>[] => [
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
      <div className="flex items-center gap-2">
        <span>{row.original.category}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={() =>
            onEditCategory(row.original.categoryId, row.original.category)
          }
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    ),
    size: 200,
  },
  {
    accessorKey: "unit",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} title="Unit" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span>{row.original.unit.desc}</span>
        <Button
          variant="outline"
          size="icon"
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
    size: 150,
  },
];
