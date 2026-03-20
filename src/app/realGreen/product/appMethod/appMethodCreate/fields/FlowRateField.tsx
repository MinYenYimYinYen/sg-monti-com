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
const timeUnits = UnitUtils.time.getAllUnits();

interface FlowRateFieldProps {
  disabled?: boolean;
}

export function FlowRateField({ disabled }: FlowRateFieldProps) {
  const {
    productType,
    setFlowRateVolume,
    setFlowRateVolumeUnit,
    setFlowRateTime,
    setFlowRateTimeUnit,
    resetFlowRate,
  } = useFormFieldValues();

  const flowRateVolume = useSelector(fieldComponentsSelect.flowRate.volume);
  const flowRateVolumeUnit = useSelector(fieldComponentsSelect.flowRate.volumeUnit);
  const flowRateTime = useSelector(fieldComponentsSelect.flowRate.time);
  const flowRateTimeUnit = useSelector(fieldComponentsSelect.flowRate.timeUnit);

  // Check which specific field is being solved for (either auto-detected or explicitly set)
  const missingField = useSelector(solverSelect.missingField);
  const solveForField = useSelector(solverSelect.solveForField);
  const isVolumeBeingSolved =
    (missingField?.param === "flowRate" && missingField?.field === "volume") ||
    (solveForField?.param === "flowRate" && solveForField?.field === "volume");
  const isTimeBeingSolved =
    (missingField?.param === "flowRate" && missingField?.field === "time") ||
    (solveForField?.param === "flowRate" && solveForField?.field === "time");

  // Select appropriate units based on product type
  const flowUnits = productType === "liquid" ? volumeUnits : weightUnits;
  const flowPlaceholder = productType === "liquid" ? "Volume" : "Weight";

  return (
    <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
      <div className="space-y-1  transition-colors has-[button:hover]:bg-destructive/30 p-1 rounded-sm">
        <div className="flex items-center justify-between">
          <FieldLabel
            label="flowRate"
            helpText="Enter the volume of fluid and time it takes to dispense that volume."
          />
          <button className="text-xs text-muted-foreground hover:text-foreground"
            type="button"
            onClick={resetFlowRate}>
            clear values
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Input
            type="number"
            placeholder={flowPlaceholder}
            value={flowRateVolume ?? ""}
            onChange={(e) =>
              setFlowRateVolume(e.target.value === "" ? undefined : Number(e.target.value))
            }
            disabled={isVolumeBeingSolved}
            step="0.01"
          />
          <UnitSelect
            units={flowUnits}
            placeholder={`${flowPlaceholder} Unit`}
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
            step="0.01"
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
