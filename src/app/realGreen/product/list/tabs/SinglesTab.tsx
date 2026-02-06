"use client";

import React from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/productSelectors";
import { DataGrid } from "@/components/DataGrid";

import { createSinglesColumns } from "@/app/realGreen/product/list/tabs/singlesColumns";
import EditCategorySheet from "@/app/realGreen/product/list/tabs/EditCategorySheet";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

export default function SinglesTab() {
  const singles = useSelector(productSelect.productSingles);

  const [editCategoryState, setEditCategoryState] = React.useState<{
    categoryId: number;
    categoryName: string;
  } | null>(null);

  const singlesColumns = React.useMemo(
    () =>
      createSinglesColumns((categoryId, categoryName) => {
        setEditCategoryState({ categoryId, categoryName });
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Single Products
        </h2>
        <p className="text-sm text-muted-foreground">
          {singles.length} product{singles.length !== 1 ? "s" : ""}
        </p>
      </div>
      <DataGrid
        data={singles}
        columns={singlesColumns}
        enableSorting={true}
        enableFiltering={true}
        enablePagination={true}
        enableColumnVisibility={true}
        rowVariant="alternating"
        globalFilterColumns={["description", "productCode"]}
        globalFilterPlaceholder="Search products..."
      />
      <EditCategorySheet
        categoryId={editCategoryState?.categoryId || baseNumId}
        categoryName={editCategoryState?.categoryName || ""}
        open={editCategoryState !== null}
        onOpenChange={(open) => !open && setEditCategoryState(null)}
      />
    </div>
  );
}
