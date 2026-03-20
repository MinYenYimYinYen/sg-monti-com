import { Input } from "@/style/components/input";
import { useSelector } from "react-redux";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { useFormFieldValues } from "@/app/realGreen/product/appMethod/appMethodCreate/useFormFieldValues";
import { fieldComponentsSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/fieldComponentsSelect";
import { solverSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/solverSelect";
import { FieldLabel } from "./shared/FieldLabel";
import { UnitSelect } from "./shared/UnitSelect";

const volumeUnits = UnitUtils.volume.getAllUnits();
const weightUnits = UnitUtils.weight.getAllUnits();
const areaUnits = UnitUtils.area.getAllUnits();

interface CoverageFieldProps {
  disabled?: boolean;
}

export function CoverageField({ disabled }: CoverageFieldProps) {
  const {
    productType,
    setCoverageVolume,
    setCoverageVolumeUnit,
    setCoverageArea,
    setCoverageAreaUnit,
    resetCoverage,
  } = useFormFieldValues();

  const coverageVolume = useSelector(fieldComponentsSelect.coverage.volume);
  const coverageVolumeUnit = useSelector(fieldComponentsSelect.coverage.volumeUnit);
  const coverageArea = useSelector(fieldComponentsSelect.coverage.area);
  const coverageAreaUnit = useSelector(fieldComponentsSelect.coverage.areaUnit);

  // Check which specific field is being solved for (either auto-detected or explicitly set)
  const missingField = useSelector(solverSelect.missingField);
  const solveForField = useSelector(solverSelect.solveForField);
  const isVolumeBeingSolved =
    (missingField?.param === "coverage" && missingField?.field === "volume") ||
    (solveForField?.param === "coverage" && solveForField?.field === "volume");
  const isAreaBeingSolved =
    (missingField?.param === "coverage" && missingField?.field === "area") ||
    (solveForField?.param === "coverage" && solveForField?.field === "area");

  // Select appropriate units based on product type
  const coverageUnits = productType === "liquid" ? volumeUnits : weightUnits;
  const coveragePlaceholder = productType === "liquid" ? "Volume" : "Weight";

  return (
    <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
      <div className="space-y-1  transition-colors has-[button:hover]:bg-destructive/30 p-1 rounded-sm">
        <div className="flex items-center justify-between">
          <FieldLabel
            label="coverage"
            helpText="Enter the volume of product applied per area of coverage."
          />
          <button className="text-xs text-muted-foreground hover:text-foreground"
            type="button"
            onClick={resetCoverage}>
            clear values
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            placeholder={coveragePlaceholder}
            value={coverageVolume ?? ""}
            onChange={(e) =>
              setCoverageVolume(e.target.value === "" ? undefined : Number(e.target.value))
            }
            disabled={isVolumeBeingSolved}
            step="0.01"
          />
          <UnitSelect
            units={coverageUnits}
            placeholder={`${coveragePlaceholder} Unit`}
            value={coverageVolumeUnit}
            onValueChange={setCoverageVolumeUnit}
          />
          <Input
            type="number"
            placeholder="Area"
            value={coverageArea ?? ""}
            onChange={(e) =>
              setCoverageArea(e.target.value === "" ? undefined : Number(e.target.value))
            }
            disabled={isAreaBeingSolved}
            step="0.01"
          />
          <UnitSelect
            units={areaUnits}
            placeholder="Area Unit"
            value={coverageAreaUnit}
            onValueChange={setCoverageAreaUnit}
          />
        </div>
      </div>
    </div>
  );
}
