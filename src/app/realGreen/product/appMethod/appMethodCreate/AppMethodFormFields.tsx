import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectValue,
} from "@/components/MultiSelect";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/style/components/popover";
import { Info } from "lucide-react";

interface FieldLabelProps {
  label: string;
  helpText: string;
}

export function FieldLabel({ label, helpText }: FieldLabelProps) {
  return (
    <div className="flex items-center gap-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="inline-flex">
            <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">{helpText}</p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface UnitSelectProps {
  units: string[];
  placeholder: string;
}

export function UnitSelect({ units, placeholder }: UnitSelectProps) {
  return (
    <MultiSelect mode="single">
      <MultiSelectTrigger>
        <MultiSelectValue placeholder={placeholder} className="capitalize" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        {units.map((unit) => (
          <MultiSelectItem key={unit} value={unit}>
            {unit}
          </MultiSelectItem>
        ))}
      </MultiSelectContent>
    </MultiSelect>
  );
}

interface RateFieldProps {
  label: string;
  helpText: string;
  valuePlaceholder: string;
  valueUnits: string[];
  valueUnitPlaceholder: string;
  timePlaceholder: string;
  timeUnits: string[];
  timeUnitPlaceholder: string;
}

export function RateField({
  label,
  helpText,
  valuePlaceholder,
  valueUnits,
  valueUnitPlaceholder,
  timePlaceholder,
  timeUnits,
  timeUnitPlaceholder,
}: RateFieldProps) {
  return (
    <div className="space-y-1">
      <FieldLabel label={label} helpText={helpText} />
      <div className="grid grid-cols-4 gap-2">
        <Input type="number" placeholder={valuePlaceholder} />
        <UnitSelect units={valueUnits} placeholder={valueUnitPlaceholder} />
        <Input type="number" placeholder={timePlaceholder} />
        <UnitSelect units={timeUnits} placeholder={timeUnitPlaceholder} />
      </div>
    </div>
  );
}

interface DistanceFieldProps {
  label: string;
  helpText: string;
  distanceUnits: string[];
}

export function DistanceField({
  label,
  helpText,
  distanceUnits,
}: DistanceFieldProps) {
  return (
    <div className="space-y-1">
      <FieldLabel label={label} helpText={helpText} />
      <div className="grid grid-cols-4 gap-2">
        <Input type="number" placeholder="Distance" />
        <UnitSelect units={distanceUnits} placeholder="Distance Unit" />
        <div className="col-span-2" />
      </div>
    </div>
  );
}

interface CoverageFieldProps {
  volumeUnits: string[];
  areaUnits: string[];
}

export function CoverageField({ volumeUnits, areaUnits }: CoverageFieldProps) {
  return (
    <div className="space-y-1">
      <FieldLabel
        label="Coverage"
        helpText="Enter the volume of product applied per area of coverage."
      />
      <div className="grid grid-cols-4 gap-2">
        <Input type="number" placeholder="Volume" />
        <UnitSelect units={volumeUnits} placeholder="Volume Unit" />
        <Input type="number" placeholder="Area" />
        <UnitSelect units={areaUnits} placeholder="Area Unit" />
      </div>
    </div>
  );
}
