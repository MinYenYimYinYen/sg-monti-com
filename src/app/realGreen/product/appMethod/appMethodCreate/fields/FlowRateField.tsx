import { Input } from "@/style/components/input";
import { useSelector } from "react-redux";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { useFormFieldValues } from "@/app/realGreen/product/appMethod/appMethodCreate/useFormFieldValues";
import { fieldComponentsSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/fieldComponentsSelect";
import { solverSelect } from "@/app/realGreen/product/appMethod/appMethodCreate/selectors/solverSelect";
import { FieldLabel } from "./shared/FieldLabel";
import { UnitSelect } from "./shared/UnitSelect";

const volumeUnits = UnitUtils.volume.getAllUnits();
const timeUnits = UnitUtils.time.getAllUnits();

interface FlowRateFieldProps {
  disabled?: boolean;
}

export function FlowRateField({ disabled }: FlowRateFieldProps) {
  const {
    setFlowRateVolume,
    setFlowRateVolumeUnit,
    setFlowRateTime,
    setFlowRateTimeUnit,
  } = useFormFieldValues();

  const flowRateVolume = useSelector(fieldComponentsSelect.flowRate.volume);
  const flowRateVolumeUnit = useSelector(fieldComponentsSelect.flowRate.volumeUnit);
  const flowRateTime = useSelector(fieldComponentsSelect.flowRate.time);
  const flowRateTimeUnit = useSelector(fieldComponentsSelect.flowRate.timeUnit);

  // Check which specific field is being solved for
  const missingField = useSelector(solverSelect.missingField);
  const isVolumeBeingSolved = missingField?.param === "flowRate" && missingField?.field === "volume";
  const isTimeBeingSolved = missingField?.param === "flowRate" && missingField?.field === "time";

  return (
    <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
      <div className="space-y-1">
        <FieldLabel
          label="flowRate"
          helpText="Enter the volume of fluid and time it takes to dispense that volume."
        />
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            placeholder="Volume"
            value={flowRateVolume ?? ""}
            onChange={(e) =>
              setFlowRateVolume(e.target.value === "" ? undefined : Number(e.target.value))
            }
            disabled={isVolumeBeingSolved}
          />
          <UnitSelect
            units={volumeUnits}
            placeholder="Volume Unit"
            value={flowRateVolumeUnit}
            onValueChange={setFlowRateVolumeUnit}
          />
          <Input
            type="number"
            placeholder="Time"
            value={flowRateTime ?? ""}
            onChange={(e) =>
              setFlowRateTime(e.target.value === "" ? undefined : Number(e.target.value))
            }
            disabled={isTimeBeingSolved}
          />
          <UnitSelect
            units={timeUnits}
            placeholder="Time Unit"
            value={flowRateTimeUnit}
            onValueChange={setFlowRateTimeUnit}
          />
        </div>
      </div>
    </div>
  );
}
