import { Input } from "@/style/components/input";
import { useSelector } from "react-redux";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { useFormFieldValues } from "@/app/realGreen/product/appMethod/appMethodCreate/useFormFieldValues";
import { fieldComponentsSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/fieldComponentsSelect";
import { FieldLabel } from "./shared/FieldLabel";
import { UnitSelect } from "./shared/UnitSelect";

const volumeUnits = UnitUtils.volume.getAllUnits();
const areaUnits = UnitUtils.area.getAllUnits();

interface CoverageFieldProps {
  disabled?: boolean;
}

export function CoverageField({ disabled }: CoverageFieldProps) {
  const {
    setCoverageVolume,
    setCoverageVolumeUnit,
    setCoverageArea,
    setCoverageAreaUnit,
  } = useFormFieldValues();

  const coverageVolume = useSelector(fieldComponentsSelect.coverage.volume);
  const coverageVolumeUnit = useSelector(fieldComponentsSelect.coverage.volumeUnit);
  const coverageArea = useSelector(fieldComponentsSelect.coverage.area);
  const coverageAreaUnit = useSelector(fieldComponentsSelect.coverage.areaUnit);

  return (
    <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
      <div className="space-y-1">
        <FieldLabel
          label="coverage"
          helpText="Enter the volume of product applied per area of coverage."
        />
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            placeholder="Volume"
            value={coverageVolume}
            onChange={(e) =>
              setCoverageVolume(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          <UnitSelect
            units={volumeUnits}
            placeholder="Volume Unit"
            value={coverageVolumeUnit}
            onValueChange={setCoverageVolumeUnit}
          />
          <Input
            type="number"
            placeholder="Area"
            value={coverageArea}
            onChange={(e) =>
              setCoverageArea(e.target.value === "" ? "" : Number(e.target.value))
            }
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
