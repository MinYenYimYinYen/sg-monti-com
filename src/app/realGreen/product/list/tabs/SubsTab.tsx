"use client";

import React, { useMemo, useState } from "react";
import { DataGrid } from "@/components/DataGrid";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { createSubsColumns } from "@/app/realGreen/product/list/tabs/subsColumns";
import EditCategorySheet from "@/app/realGreen/product/list/tabs/EditCategorySheet";
import EditUnitSheet from "@/app/realGreen/product/list/tabs/EditUnitSheet";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";

export default function SubsTab() {
  const subs = useSelector(productSelect.productSubs);
  const [editCategoryState, setEditCategoryState] = useState<{
    categoryId: number;
    categoryName: string;
  } | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const subsColumns = useMemo(
    () =>
      createSubsColumns(
        (categoryId, categoryName) => {
          setEditCategoryState({ categoryId, categoryName });
        },
        (unit) => setEditingUnit(unit),
      ),
    [],
  );

  return (
    <div className={"space-y-4"}>
      <div className={"flex items-center justify-between"}>
        <h2 className={"text-2xl font-semibold tracking-tight"}>Subs</h2>
        <p className={"text-sm text-muted-foreground"}>
          Available Sub-Products
        </p>
      </div>
      <DataGrid
        data={subs}
        columns={subsColumns}
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
      <EditUnitSheet
        unit={editingUnit}
        open={editingUnit !== null}
        onOpenChange={(open) => !open && setEditingUnit(null)}
      />
    </div>
  );
}
