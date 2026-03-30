import { useSelector, useDispatch } from "react-redux";
import { loadoutStartSelect } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSelect";
import { loadoutStartActions } from "@/app/scheduling/dailyInventory/loadoutStart/loadoutStartSlice";
import { useLoadoutStartForm } from "@/app/scheduling/dailyInventory/loadoutStart/useLoadoutStartForm";
import { Input } from "@/style/components/input";
import { X } from "lucide-react";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { getFieldPath } from "@/lib/validation/getFieldPath";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

type SingleProductInputProps = {
  singleIndex: number;
};

export function SingleProductInput({ singleIndex }: SingleProductInputProps) {
  const dispatch = useDispatch();
  const { updateLoadout, removeProductFromLoadout } = useLoadoutStartForm();

  const loadout = useSelector(loadoutStartSelect.loadout.data);
  const single = loadout.singles[singleIndex];

  // Build field path for validation
  const fieldPath = getFieldPath<LoadoutBase>()
    .field("singles")
    .index(singleIndex)
    .field("startAmount")
    .toString();

  // Use proper validation selectors that respect touched state
  const shouldShow = useSelector(
    loadoutStartSelect.loadout.startValidation.shouldShowFieldIssue(fieldPath),
  );
  const allIssues = useSelector(loadoutStartSelect.loadout.startValidation.issues);
  const fieldIssue = shouldShow ? allIssues[fieldPath] : undefined;

  // Conditional render - check if single exists AFTER all hooks
  if (!single) return null;

  // NOW it's safe to use single because all hooks have been called above

  // Convert app units to load units for display
  const displayValue =
    single.startAmount != null
      ? convertQuantity(
          single.startAmount,
          "app",
          "load",
          single.product.unitConfig,
        )
      : "";

  const handleAmountChange = (value: number | null) => {
    const updatedSingles = loadout.singles.map((s, idx) => {
      if (idx === singleIndex) {
        return { ...s, startAmount: value };
      }
      return s;
    });
    updateLoadout({ singles: updatedSingles });
  };

  return (
    <div
      className={"flex items-center gap-2 bg-accent/10 rounded px-2 py-1"}
    >
      <div className={"flex-1 text-sm text-foreground/90"}>
        {single.product.description}
      </div>
      <div className="flex flex-col items-end">
        <Input
          type="number"
          placeholder="Start amount"
          className={`w-24 ${fieldIssue ? "border-red-500" : ""}`}
          value={displayValue}
          onChange={(e) => {
            const loadValue = e.target.value ? parseFloat(e.target.value) : null;
            // Convert load units to app units for storage
            const appValue =
              loadValue != null
                ? convertQuantity(
                    loadValue,
                    "load",
                    "app",
                    single.product.unitConfig,
                  )
                : null;
            handleAmountChange(appValue);
          }}
          onBlur={() => {
            dispatch(loadoutStartActions.markStartLoadoutFieldTouched(fieldPath));
          }}
        />
        {fieldIssue && (
          <span className="text-red-500 text-xs mt-1">{fieldIssue}</span>
        )}
      </div>
      <button
        onClick={() => removeProductFromLoadout(single.product.productId)}
        className="text-destructive hover:text-destructive/80"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
