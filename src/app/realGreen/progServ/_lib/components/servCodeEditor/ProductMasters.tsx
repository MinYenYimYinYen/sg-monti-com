import React from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/productSelectors";
import { Badge } from "@/style/components/badge";
import { ListBox } from "@/components/ListBox";

interface ProductMastersProps {
  selectedMasterIds: number[];
  setSelectedMasterIds: React.Dispatch<React.SetStateAction<number[]>>;
}

export function ProductMasters({
  selectedMasterIds,
  setSelectedMasterIds,
}: ProductMastersProps) {
  const masters = useSelector(productSelect.productMasters);

  return (
    <div id="MASTERS" className="h-full">
      <ListBox
        items={masters}
        selectedKeys={selectedMasterIds}
        onSelectionChange={setSelectedMasterIds}
        keyExtractor={(item) => item.productId}
        enableFilter={true}
        filterFn={(item, filter) =>
          item.productCode.toLowerCase().includes(filter.toLowerCase()) ||
          item.description.toLowerCase().includes(filter.toLowerCase())
        }
        renderItem={(master) => (
          <div className={"flex items-center gap-2 overflow-hidden"}>
            <span
              className={"font-mono text-xs text-muted-foreground shrink-0"}
            >
              {master.productCode}
            </span>
            <span className={"text-sm font-medium truncate"}>
              {master.description}
            </span>
            <div className={"flex items-center gap-1 ml-auto shrink-0"}>
              {master.subProducts.map((sub) => (
                <Badge
                  key={sub.productId}
                  variant={"outline"}
                  className="px-1 py-0 text-[10px] h-5"
                >
                  {sub.productCode}
                </Badge>
              ))}
            </div>
          </div>
        )}
      />
    </div>
  );
}
