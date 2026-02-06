"use client";

import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/productSelectors";
import { DataGrid } from "@/components/DataGrid";
import { Row } from "@tanstack/react-table";
import { MasterEditSheet } from "./MasterEditSheet";
import { createMastersColumns } from "@/app/realGreen/product/list/tabs/mastersColumns";
import EditCategorySheet from "@/app/realGreen/product/list/tabs/EditCategorySheet";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export default function MastersTab() {
  const masters = useSelector(productSelect.productMasters);
  const subsMap = useSelector(productSelect.productSubsMap);
  const [editingMaster, setEditingMaster] =
    React.useState<ProductMaster | null>(null);
  const [editCategoryState, setEditCategoryState] = React.useState<{
    categoryId: number;
    categoryName: string;
  } | null>(null);

  const mastersColumns = useMemo(() => {
    return createMastersColumns(
      setEditingMaster,
      (categoryId, categoryName) =>
        setEditCategoryState({ categoryId, categoryName }),
    );
  }, []);

  const renderSubComponent = (row: Row<ProductMaster>) => {
    const master = row.original;
    const subProducts = master.subProductIds
      .map((id) => subsMap.get(id))
      .filter(Boolean);

    if (subProducts.length === 0) {
      return (
        <div className="p-4 text-sm text-muted-foreground">
          No sub-products configured
        </div>
      );
    }

    return (
      <div className="p-4">
        <h4 className="mb-2 text-sm font-semibold">Sub-Products:</h4>
        <div className="space-y-1">
          {subProducts.map((sub) => (
            <div key={sub!.productId} className="flex gap-4 text-sm pl-4">
              <span className="font-mono text-muted-foreground min-w-[120px]">
                {sub!.productCode}
              </span>
              <span>{sub!.description}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Master Products
        </h2>
        <p className="text-sm text-muted-foreground">
          {masters.length} product{masters.length !== 1 ? "s" : ""}
        </p>
      </div>
      <DataGrid
        data={masters}
        columns={mastersColumns}
        enableSorting={true}
        enableFiltering={true}
        enablePagination={true}
        enableColumnVisibility={true}
        enableRowExpansion={true}
        getRowCanExpand={() => true}
        renderSubComponent={renderSubComponent}
        rowVariant="expandable"
        globalFilterColumns={["description", "productCode"]}
        globalFilterPlaceholder="Search products..."
      />
      <MasterEditSheet
        master={editingMaster}
        open={editingMaster !== null}
        onOpenChange={(open) => !open && setEditingMaster(null)}
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
