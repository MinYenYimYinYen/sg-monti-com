import { Input } from "@/style/components/input";
import { useSelector } from "react-redux";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { useFormFieldValues } from "@/app/appMethod/appMethodCreate/useFormFieldValues";
import { fieldComponentsSelect } from "@/app/appMethod/appMethodCreate/selectors/fieldComponentsSelect";
import { solverSelect } from "@/app/appMethod/appMethodCreate/selectors/solverSelect";
import { FieldLabel } from "../shared/FieldLabel";
import { UnitSelect } from "../shared/UnitSelect";

const distanceUnits = UnitUtils.distance.getAllUnits();

interface PatternWidthFieldProps {
  disabled?: boolean;
}

export function PatternWidthField({ disabled }: PatternWidthFieldProps) {
  const { setPatternWidthDistance, setPatternWidthDistanceUnit, resetPatternWidth } =
    useFormFieldValues();

  const patternWidth = useSelector(fieldComponentsSelect.patternWidth.distance);
  const patternWidthUnit = useSelector(
    fieldComponentsSelect.patternWidth.distanceUnit,
  );

  // Check if this field is being solved for (either auto-detected or explicitly set)
  const missingField = useSelector(solverSelect.missingField);
  const solveForField = useSelector(solverSelect.solveForField);
  // When solveForField is explicitly set, only that field is disabled.
  // In auto-detect mode (solveForField === null), disable the auto-detected missing field.
  const isDistanceBeingSolved = solveForField !== null
    ? solveForField.param === "patternWidth" && solveForField.field === "distance"
    : missingField?.param === "patternWidth" && missingField?.field === "distance";

  return (
    <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
      <div className="space-y-1  transition-colors has-[button:hover]:bg-destructive/30 p-1 rounded-sm">
        <div className="flex items-center justify-between">
          <FieldLabel
            label="patternWidth"
            helpText="Enter the width of the application pattern."
          />
          <button className="text-xs text-muted-foreground hover:text-foreground"
            type="button"
            onClick={resetPatternWidth}>
            clear values
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            placeholder="Distance"
            value={patternWidth ?? ""}
            onChange={(e) =>
              setPatternWidthDistance(
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
            disabled={isDistanceBeingSolved}
            step="0.01"
          />
          <UnitSelect
            units={distanceUnits}
            placeholder="Distance Unit"
            value={patternWidthUnit}
            onValueChange={setPatternWidthDistanceUnit}
          />
          <div className="col-span-2" />
        </div>
      </div>
    </div>
  );
}
