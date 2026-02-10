import React from "react";
import { Label } from "@/style/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { Input } from "@/style/components/input";
import { Badge } from "@/style/components/badge";
import { useProgServ } from "@/app/realGreen/progServ/_lib/useProgServ";
import { useSelector } from "react-redux";
import { servCodeLookup } from "@/app/realGreen/progServ/_lib/selectors/servCodeLookups";
import { ServCodeProductDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeProduct";
import { productSelect } from "@/app/realGreen/product/_lib/productSelectors";

interface ServiceProductConfiguratorProps {
  servCodeId: string;
  productDoc: ServCodeProductDoc;
}

export function ServiceProductConfigurator({
  servCodeId,
  productDoc,
}: ServiceProductConfiguratorProps) {
  const { updateServCode } = useProgServ({});
  const servCode = useSelector(servCodeLookup.docById(servCodeId));
  const mastersMap = useSelector(productSelect.productMastersMap);
  const singlesMap = useSelector(productSelect.productSinglesMap);

  if (!servCode) return null;

  // Determine which product this doc refers to
  const isMaster = productDoc.productMasterIds.length > 0;
  const productId = isMaster
    ? productDoc.productMasterIds[0]
    : productDoc.productSingleIds[0];

  const product = isMaster
    ? mastersMap.get(productId)
    : singlesMap.get(productId);

  if (!product) return null;

  const { sizeOperator, size } = productDoc;

  const handleUpdate = (updates: Partial<ServCodeProductDoc>) => {
    // Find the index of THIS specific doc in the array
    // Since we are passed the doc object, we can find it by reference or by content match
    // But reference equality might be tricky with Redux immutability if we aren't careful.
    // However, since we are inside a component that re-renders when servCode changes,
    // we should find the index based on the ID match.

    const index = servCode.productDocs.findIndex((d) => {
      if (isMaster) {
        return d.productMasterIds.includes(productId);
      } else {
        return d.productSingleIds.includes(productId);
      }
    });

    if (index === -1) return;

    const newDocs = [...servCode.productDocs];
    newDocs[index] = { ...productDoc, ...updates };
    updateServCode({ servCodeId, productDocs: newDocs });
  };

  return (
    <div className="flex flex-col gap-2 border rounded-md p-3 bg-card">
      <div className="flex items-center gap-2 overflow-hidden mb-2">
        <span className="font-mono text-xs text-muted-foreground shrink-0">
          {product.productCode}
        </span>
        <span className="text-sm font-medium truncate">
          {product.description}
        </span>
        {"subProducts" in product && (
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {product.subProducts.map((sub) => (
              <Badge
                key={sub.productId}
                variant="outline"
                className="px-1 py-0 text-[10px] h-5"
              >
                {sub.productCode}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">Rule:</Label>
          <Select
            value={sizeOperator}
            onValueChange={(val: "lte" | "gt" | "all") =>
              handleUpdate({ sizeOperator: val })
            }
          >
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Select rule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Always Apply</SelectItem>
              <SelectItem value="lte">Size ≤</SelectItem>
              <SelectItem value="gt">Size &gt;</SelectItem>
            </SelectContent>
          </Select>
          {sizeOperator !== "all" && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={size}
                onChange={(e) => handleUpdate({ size: Number(e.target.value) })}
                className="h-8 w-[80px] text-xs"
                placeholder="Size"
              />
              <span className="text-xs text-muted-foreground">sq ft</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
