import { Input } from "@/style/components/input";
import { useSelector } from "react-redux";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { useFormFieldValues } from "@/app/realGreen/product/appMethod/appMethodCreate/useFormFieldValues";
import { fieldComponentsSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/fieldComponentsSelect";
import { solverSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/solverSelect";
import { FieldLabel } from "./shared/FieldLabel";
import { UnitSelect } from "./shared/UnitSelect";

const distanceUnits = UnitUtils.distance.getAllUnits();
const timeUnits = UnitUtils.time.getAllUnits();

interface GroundSpeedFieldProps {
  disabled?: boolean;
}

export function GroundSpeedField({ disabled }: GroundSpeedFieldProps) {
  const {
    setGroundSpeedTime,
    setGroundSpeedDistance,
    setGroundSpeedDistanceUnit,
    setGroundSpeedTimeUnit,
  } = useFormFieldValues();

  const groundSpeedTime = useSelector(fieldComponentsSelect.groundSpeed.time);
  const groundSpeedDistance = useSelector(fieldComponentsSelect.groundSpeed.distance);
  const groundSpeedDistanceUnit = useSelector(fieldComponentsSelect.groundSpeed.distanceUnit);
  const groundSpeedTimeUnit = useSelector(fieldComponentsSelect.groundSpeed.timeUnit);

  // Check if this field is being solved for
  const solveForField = useSelector(solverSelect.solveForField);
  const isBeingSolved = solveForField === "groundSpeed";

  return (
    <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
      <div className="space-y-1">
        <FieldLabel
          label="groundSpeed"
          helpText="Enter the distance and time it takes to travel that distance."
        />
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            placeholder="Distance"
            value={groundSpeedDistance}
            onChange={(e) =>
              setGroundSpeedDistance(e.target.value === "" ? "" : Number(e.target.value))
            }
            disabled={isBeingSolved}
          />
          <UnitSelect
            units={distanceUnits}
            placeholder="Distance Unit"
            value={groundSpeedDistanceUnit}
            onValueChange={setGroundSpeedDistanceUnit}
          />
          <Input
            type="number"
            placeholder="Time"
            value={groundSpeedTime}
            onChange={(e) =>
              setGroundSpeedTime(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          <UnitSelect
            units={timeUnits}
            placeholder="Time Unit"
            value={groundSpeedTimeUnit}
            onValueChange={setGroundSpeedTimeUnit}
          />
        </div>
      </div>
    </div>
  );
}
