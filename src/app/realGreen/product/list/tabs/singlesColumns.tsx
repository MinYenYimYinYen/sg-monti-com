// Singles Table Columns
import { ColumnDef } from "@tanstack/react-table";
import { ProductSingleDoc } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { DataGridColumnHeader } from "@/components/DataGrid";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { Button } from "@/style/components/button";
import { Pencil } from "lucide-react";

export const createSinglesColumns = (
  onEditCategory: (categoryId: number, categoryName: string) => void
): ColumnDef<ProductSingleDoc>[] => [
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
        <span>
          {row.original.category === baseStrId
            ? row.original.categoryId
            : row.original.category}
        </span>
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
];
