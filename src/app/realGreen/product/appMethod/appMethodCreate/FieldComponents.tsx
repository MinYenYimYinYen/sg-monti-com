import { RateField, DistanceField, CoverageField } from "./AppMethodFormFields";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";

const volumeUnits = UnitUtils.volume.getAllUnits();
const areaUnits = UnitUtils.area.getAllUnits();
const distanceUnits = UnitUtils.distance.getAllUnits();
const timeUnits = UnitUtils.time.getAllUnits();

interface FieldComponentProps {
  disabled?: boolean;
}

export function GroundSpeedField({ disabled }: FieldComponentProps) {
  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <RateField
        label="Ground Speed"
        helpText="Enter the distance and time it takes to travel that distance."
        valuePlaceholder="Distance"
        valueUnits={distanceUnits}
        valueUnitPlaceholder="Distance Unit"
        timePlaceholder="Time"
        timeUnits={timeUnits}
        timeUnitPlaceholder="Time Unit"
      />
    </div>
  );
}

export function PatternWidthField({ disabled }: FieldComponentProps) {
  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <DistanceField
        label="Pattern Width"
        helpText="Enter the width of the application pattern."
        distanceUnits={distanceUnits}
      />
    </div>
  );
}

export function FlowRateField({ disabled }: FieldComponentProps) {
  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <RateField
        label="Flow Rate"
        helpText="Enter the volume of fluid and time it takes to dispense that volume."
        valuePlaceholder="Volume"
        valueUnits={volumeUnits}
        valueUnitPlaceholder="Volume Unit"
        timePlaceholder="Time"
        timeUnits={timeUnits}
        timeUnitPlaceholder="Time Unit"
      />
    </div>
  );
}

export function CoverageFieldComponent({ disabled }: FieldComponentProps) {
  return (
    <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
      <CoverageField volumeUnits={volumeUnits} areaUnits={areaUnits} />
    </div>
  );
}
