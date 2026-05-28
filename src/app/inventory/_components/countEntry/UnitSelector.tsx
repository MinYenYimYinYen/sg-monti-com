"use client";

import { UnitLabel, UL_METRIC_MAP, Metric } from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";

type UnitSelectorProps = {
  metric: Metric;
  value: UnitLabel;
  onChange: (unit: UnitLabel) => void;
};

// All UnitLabel values filtered by metric
function getUnitsForMetric(metric: Metric): UnitLabel[] {
  return (Object.entries(UL_METRIC_MAP) as [UnitLabel, Metric][])
    .filter(([, m]) => m === metric)
    .map(([label]) => label);
}

export function UnitSelector({ metric, value, onChange }: UnitSelectorProps) {
  const units = getUnitsForMetric(metric);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as UnitLabel)}>
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {units.map((unit) => (
          <SelectItem key={unit} value={unit}>
            {unit}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
