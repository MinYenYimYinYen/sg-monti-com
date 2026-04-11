import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import { loadoutFinishSelect } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSelect";
import { loadoutFinishActions } from "@/app/scheduling/dailyInventory/loadoutFinish/loadoutFinishSlice";
import { loadoutActions } from "@/app/loadout/loadoutSlice";
import { Input } from "@/style/components/input";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { getFieldPath } from "@/lib/validation/getFieldPath";
import { LoadoutBase } from "@/app/loadout/LoadoutTypes";
import { cn, md } from "@/style/utils";

type CustomSubProductFinishInputProps = {
  subProductIndex: number;
  isStored: boolean;
};

export function CustomSubProductFinishInput({
  subProductIndex,
  isStored,
}: CustomSubProductFinishInputProps) {
  const dispatch = useDispatch();

  const finishLoadout = useSelector(loadoutFinishSelect.finishLoadout.data);
  const subProduct = finishLoadout.subProducts[subProductIndex];

  const fieldPath = getFieldPath<LoadoutBase>()
    .field("subProducts")
    .index(subProductIndex)
    .field("finishAmount")
    .toString();

  const shouldShow = useSelector(
    loadoutFinishSelect.finishLoadout.finishValidation.shouldShowFieldIssue(fieldPath),
  );
  const allIssues = useSelector(loadoutFinishSelect.finishLoadout.finishValidation.issues);
  const fieldIssue = shouldShow ? allIssues[fieldPath] : undefined;

  // Local string state intermediates between the user's raw input and the Redux number.
  const initialDisplayValue =
    subProduct?.finishAmount != null
      ? String(
          convertQuantity(
            subProduct.finishAmount,
            "app",
            "load",
            subProduct.product.unitConfig,
          ),
        )
      : "";

  const [inputValue, setInputValue] = useState(initialDisplayValue);

  if (!subProduct) return null;

  const startAmountDisplay =
    subProduct.startAmount != null
      ? subProduct.product.unitConfigDisplay.format({
          amount: subProduct.startAmount,
          targetContexts: ["load"],
          rounding: "none",
        }).formattedString
      : "—";

  return (
    <div className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}>
      <div className="flex-1 min-w-0">
        <div className={cn("text-xs text-foreground/90 truncate", md("text-sm"))}>{subProduct.product.description}</div>
        <div className={"text-xs text-foreground/70"}>Start: {startAmountDisplay}</div>
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        <Input
          type="number"
          inputMode="decimal"
          placeholder={subProduct.product.unitConfig.conversions.load.unitLabel}
          className={cn("w-16", md("w-24"), fieldIssue ? "border-red-500" : "")}
          value={inputValue}
          disabled={isStored}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          onBlur={() => {
            const loadValue = inputValue !== "" ? parseFloat(inputValue) : null;
            const appValue =
              loadValue != null && !isNaN(loadValue)
                ? convertQuantity(
                    loadValue,
                    "load",
                    "app",
                    subProduct.product.unitConfig,
                  )
                : null;
            dispatch(
              loadoutActions.updateFinishLoadoutSubProductAmount({
                productId: subProduct.productId,
                value: appValue,
              }),
            );
            dispatch(loadoutFinishActions.markFinishLoadoutFieldTouched(fieldPath));
          }}
        />
        {fieldIssue && (
          <span className="text-red-500 text-xs mt-1">{fieldIssue}</span>
        )}
      </div>
    </div>
  );
}
