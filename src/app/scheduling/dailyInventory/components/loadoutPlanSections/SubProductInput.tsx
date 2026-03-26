import { useSelector, useDispatch } from "react-redux";
import { loadoutFormSelect } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSelect";
import { loadoutFormActions } from "@/app/scheduling/dailyInventory/_lib/loadoutFormSlice";
import { useLoadoutForm } from "@/app/scheduling/dailyInventory/_lib/useLoadoutForm";
import { Input } from "@/style/components/input";
import { convertQuantity } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { getFieldPath } from "@/lib/validation/getFieldPath";
import { LoadoutBase } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";

type SubProductInputProps = {
  masterProductId: number;
  subProductId: number;
  masterIndex: number;
  subProductIndex: number;
};

export function SubProductInput({
  masterProductId,
  subProductId,
  masterIndex,
  subProductIndex,
}: SubProductInputProps) {
  const dispatch = useDispatch();
  const { updateLoadout } = useLoadoutForm();

  const loadout = useSelector(loadoutFormSelect.loadout.data);

  // Find the specific master and sub product
  const master = loadout.masters[masterIndex];
  const subProduct = master?.subProducts[subProductIndex];

  // Build field path for validation
  const fieldPath = getFieldPath<LoadoutBase>()
    .field("masters")
    .index(masterIndex)
    .field("subProducts")
    .index(subProductIndex)
    .field("startAmount")
    .toString();

  // Use proper validation selectors that respect touched state
  const shouldShow = useSelector(
    loadoutFormSelect.loadout.startValidation.shouldShowFieldIssue(fieldPath)
  );
  const allIssues = useSelector(loadoutFormSelect.loadout.startValidation.issues);
  const fieldIssue = shouldShow ? allIssues[fieldPath] : undefined;

  // Conditional render - check if subProduct exists AFTER all hooks
  if (!subProduct) return null;

  // NOW it's safe to use subProduct because all hooks have been called above

  // Convert app units to load units for display
  const displayValue =
    subProduct.startAmount != null
      ? convertQuantity(
          subProduct.startAmount,
          "app",
          "load",
          subProduct.product.unitConfig
        )
      : "";

  // Format planned amount for display
  const plannedAmountDisplay = subProduct.product.unitConfigDisplay.format({
    amount: subProduct.plannedAmount,
    targetContexts: ["load"],
    rounding: "none",
  }).formattedString;

  const handleAmountChange = (value: number | null) => {
    const updatedMasters = loadout.masters.map((m, idx) => {
      if (idx === masterIndex) {
        return {
          ...m,
          subProducts: m.subProducts.map((s, subIdx) => {
            if (subIdx === subProductIndex) {
              return { ...s, startAmount: value };
            }
            return s;
          }),
        };
      }
      return m;
    });

    updateLoadout({ masters: updatedMasters });
  };

  return (
    <div
      className={
        "flex items-center justify-between gap-2 bg-accent/10 rounded px-1 py-1"
      }
    >
      <div>
        <div className={"flex-1 text-sm text-foreground/90"}>
          {subProduct.product.productCode}
        </div>
        <div className={"text-xs text-foreground/70"}>
          Planned: {plannedAmountDisplay}
        </div>
      </div>
      <div className="flex flex-col items-end">
        <Input
          type="number"
          placeholder={
            subProduct.product.unitConfig.conversions.load.unitLabel
          }
          className={`w-32 ${fieldIssue ? "border-red-500" : ""}`}
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
                    subProduct.product.unitConfig
                  )
                : null;
            handleAmountChange(appValue);
          }}
          onBlur={() => {
            dispatch(loadoutFormActions.markStartLoadoutFieldTouched(fieldPath));
          }}
        />
        {fieldIssue && (
          <span className="text-red-500 text-xs mt-1">{fieldIssue}</span>
        )}
      </div>
    </div>
  );
}
