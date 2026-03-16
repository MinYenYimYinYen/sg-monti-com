import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

export enum AppUnit {
  lbs = "Lbs",
  flOz = "Fl Oz",
  sf = "SF",
  ksf = "1000 SF",
  ea = "Ea",
  dot = "Dot",
  mGal = "Mixed Gal",
  sec = "Seconds",
  min = "Minutes",
  bulb = "Bulb Charge",
  ft = "Feet",
  unknown = "?",
}

export type Metric =
  | "area"
  | "count"
  | "length"
  | "time"
  | "volume"
  | "weight"
  | "unknown"

export const UL_METRIC_MAP = {
  [AppUnit.sf]: "area",
  [AppUnit.ksf]: "area",
  [AppUnit.ea]: "count",
  [AppUnit.bulb]: "count",
  [AppUnit.dot]: "count",
  [AppUnit.ft]: "length",
  [AppUnit.sec]: "time",
  [AppUnit.min]: "time",
  [AppUnit.mGal]: "volume",
  [AppUnit.flOz]: "volume",
  [AppUnit.lbs]: "weight",
  [AppUnit.unknown]: "unknown",
} as const satisfies Record<AppUnit, Metric>;



export function getMetricForUL(ul: AppUnit): Metric {
  return UL_METRIC_MAP[ul] || "unknown";
}

export type UnitStorage = {
  unitId: number;
  metric: Metric;
  desc: string;
};

/**
 * Helper type to extract all AppUnit values that map to a specific Metric
 */
type UnitsForMetric<M extends Metric> = {
  [K in keyof typeof UL_METRIC_MAP]: typeof UL_METRIC_MAP[K] extends M ? K : never
}[keyof typeof UL_METRIC_MAP];

// Base unit types (without unitId) - for calculations and arbitrary unit creation
export type AreaUnit = {
  metric: "area";
  desc: UnitsForMetric<"area">;
};

export type CountUnit = {
  metric: "count";
  desc: UnitsForMetric<"count">;
};

export type LengthUnit = {
  metric: "length";
  desc: UnitsForMetric<"length">;
};

export type TimeUnit = {
  metric: "time";
  desc: UnitsForMetric<"time">;
};

export type VolumeUnit = {
  metric: "volume";
  desc: UnitsForMetric<"volume">;
};

export type WeightUnit = {
  metric: "weight";
  desc: UnitsForMetric<"weight">;
};

type UnknownUnit = {
  metric: "unknown";
  desc: UnitsForMetric<"unknown">;
};

// CRM unit types (with unitId) - extend base types
export type AreaUnitCRM = AreaUnit & {
  unitId: number;
};

export type CountUnitCRM = CountUnit & {
  unitId: number;
};

export type LengthUnitCRM = LengthUnit & {
  unitId: number;
};

export type TimeUnitCRM = TimeUnit & {
  unitId: number;
};

export type VolumeUnitCRM = VolumeUnit & {
  unitId: number;
};

export type WeightUnitCRM = WeightUnit & {
  unitId: number;
};

type UnknownUnitCRM = UnknownUnit & {
  unitId: number;
};

// Union of base unit types (no unitId)
export type Unit =
  | AreaUnit
  | CountUnit
  | LengthUnit
  | TimeUnit
  | WeightUnit
  | UnknownUnit
  | VolumeUnit;

// Union of CRM unit types (with unitId)
export type UnitCRM =
  | AreaUnitCRM
  | CountUnitCRM
  | LengthUnitCRM
  | TimeUnitCRM
  | WeightUnitCRM
  | UnknownUnitCRM
  | VolumeUnitCRM;

// Base unit constant (for calculations)
export const baseUnit: Unit = {
  metric: "unknown",
  desc: AppUnit.unknown,
};

// CRM unit constant (for database/CRM data)
export const baseUnitCRM: UnitCRM = {
  unitId: baseNumId,
  metric: "unknown",
  desc: AppUnit.unknown,
};
