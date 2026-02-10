import React from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/productSelectors";
import { ListBox } from "@/components/ListBox";

interface ProductSinglesProps {
  selectedSingleIds: number[];
  setSelectedSingleIds: React.Dispatch<React.SetStateAction<number[]>>;
}

export function ProductSingles({
  selectedSingleIds,
  setSelectedSingleIds,
}: ProductSinglesProps) {
  const singles = useSelector(productSelect.productSingles);

  return (
    <div id={"SINGLES"} className="h-full">
      <ListBox
        items={singles}
        selectedKeys={selectedSingleIds}
        onSelectionChange={setSelectedSingleIds}
        keyExtractor={(item) => item.productId}
        enableFilter={true}
        filterFn={(item, filter) =>
          item.productCode.toLowerCase().includes(filter.toLowerCase()) ||
          item.description.toLowerCase().includes(filter.toLowerCase())
        }
        renderItem={(single) => (
          <div className={"flex items-center gap-2 overflow-hidden"}>
            <span
              className={"font-mono text-xs text-muted-foreground shrink-0"}
            >
              {single.productCode}
            </span>
            <span className={"text-sm font-medium truncate"}>
              {single.description}
            </span>
          </div>
        )}
      />
    </div>
  );
}
