import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { productSelect } from "@/app/realGreen/product/_lib/selectors/productSelectors";
import { Badge } from "@/style/components/badge";
import { ListBox } from "@/components/ListBox";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { useProgServ } from "@/app/realGreen/progServ/_lib/useProgServ";
import { baseServCodeProduct } from "@/app/realGreen/progServ/_lib/types/ServCodeProduct";

interface ProductMastersProps {
  servCodeId: string;
}

export function ProductMasters({ servCodeId }: ProductMastersProps) {
  const { updateServCode } = useProgServ({});

  const masters = useSelector(productSelect.productMasters);
  const servCodeDoc = useSelector(servCodeLookup.docById(servCodeId));

  const selectedMasterIds = useMemo(() => {
    if (!servCodeDoc?.serviceProducts) return [];
    return Array.from(
      new Set(servCodeDoc.serviceProducts.flatMap((sp) => sp.productMasterIds)),
    );
  }, [servCodeDoc]);

  const handleSelectionChange = (newSelectedIds: number[]) => {
    if (!servCodeDoc) return;

    const currentIds = new Set(selectedMasterIds);
    const newIds = new Set(newSelectedIds);

    const addedIds = newSelectedIds.filter((id) => !currentIds.has(id));
    const removedIds = selectedMasterIds.filter((id) => !newIds.has(id));

    if (addedIds.length === 0 && removedIds.length === 0) return;

    // Clone the serviceProducts array to avoid mutation
    const newServiceProducts = (servCodeDoc.serviceProducts || []).map(
      (sp) => ({
        ...sp,
        productMasterIds: [...sp.productMasterIds],
      }),
    );

    // 1. Handle Removals (Remove from ALL entries)
    if (removedIds.length > 0) {
      newServiceProducts.forEach((sp) => {
        sp.productMasterIds = sp.productMasterIds.filter(
          (id) => !removedIds.includes(id),
        );
      });
    }

    // 2. Handle Additions (Add to 'all' entry)
    if (addedIds.length > 0) {
      let defaultEntry = newServiceProducts.find(
        (sp) => sp.sizeOperator === "all",
      );

      if (!defaultEntry) {
        defaultEntry = {
          ...baseServCodeProduct,
          sizeOperator: "all",
          productMasterIds: [],
        };
        newServiceProducts.push(defaultEntry);
      }

      // Add unique IDs
      addedIds.forEach((id) => {
        if (!defaultEntry!.productMasterIds.includes(id)) {
          defaultEntry!.productMasterIds.push(id);
        }
      });
    }

    updateServCode({ servCodeId, serviceProducts: newServiceProducts });
  };

  return (
    <div id="MASTERS" className="h-full">
      <ListBox
        items={masters}
        selectedKeys={selectedMasterIds}
        onSelectionChange={handleSelectionChange}
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
