import { Input } from "@/style/components/input";
import { useSelector } from "react-redux";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { useFormFieldValues } from "@/app/realGreen/product/appMethod/appMethodCreate/useFormFieldValues";
import { fieldComponentsSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/fieldComponentsSelect";
import { solverSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/solverSelect";
import { FieldLabel } from "./shared/FieldLabel";
import { UnitSelect } from "./shared/UnitSelect";

const distanceUnits = UnitUtils.distance.getAllUnits();

interface PatternWidthFieldProps {
  disabled?: boolean;
}

export function PatternWidthField({ disabled }: PatternWidthFieldProps) {
  const { setPatternWidthDistance, setPatternWidthDistanceUnit } = useFormFieldValues();

  const patternWidth = useSelector(fieldComponentsSelect.patternWidth.distance);
  const patternWidthUnit = useSelector(fieldComponentsSelect.patternWidth.distanceUnit);

  // Check if this field is being solved for
  const solveForField = useSelector(solverSelect.solveForField);
  const isBeingSolved = solveForField === "patternWidth";

  return (
    <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
      <div className="space-y-1">
        <FieldLabel
          label="patternWidth"
          helpText="Enter the width of the application pattern."
        />
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            placeholder="Distance"
            value={patternWidth}
            onChange={(e) =>
              setPatternWidthDistance(e.target.value === "" ? "" : Number(e.target.value))
            }
            disabled={isBeingSolved}
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
