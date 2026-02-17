import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

export enum AppUnit {
  lbs = "Lbs",
  flOz = "Fl Oz",
  ksf = "1000 SF",
  ea = "Ea",
  dot = "Dot",
  mGal = "Mixed Gal",
  sec = "Seconds",
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
  | "none";

export const UL_METRIC_MAP: Record<AppUnit, Metric> = {
  [AppUnit.ksf]: "area",
  [AppUnit.ea]: "count",
  [AppUnit.bulb]: "count",
  [AppUnit.dot]: "count",
  [AppUnit.ft]: "length",
  [AppUnit.sec]: "time",
  [AppUnit.mGal]: "volume",
  [AppUnit.flOz]: "volume",
  [AppUnit.lbs]: "weight",
  [AppUnit.unknown]: "unknown",
};

export function getMetricForUL(ul: AppUnit): Metric {
  return UL_METRIC_MAP[ul] || "unknown";
}

export type UnitStorage = {
  unitId: number;
  metric: Metric;
  desc: string;
};

export type AreaUnit = {
  unitId: number;
  metric: "area";
  desc: AppUnit.ksf;
};

export type CountUnit = {
  unitId: number;
  metric: "count";
  desc: AppUnit.ea | AppUnit.bulb | AppUnit.dot;
};

export type LengthUnit = {
  unitId: number;
  metric: "length";
  desc: AppUnit.ft;
};

export type TimeUnit = {
  unitId: number;
  metric: "time";
  desc: AppUnit.sec;
};

export type VolumeUnit = {
  unitId: number;
  metric: "volume";
  desc: AppUnit.mGal | AppUnit.flOz;
};

export type WeightUnit = {
  unitId: number;
  metric: "weight";
  desc: AppUnit.lbs;
};

type UnknownUnit = {
  unitId: number;
  metric: "unknown";
  desc: AppUnit.unknown;
};

export type Unit =
  | AreaUnit
  | CountUnit
  | LengthUnit
  | TimeUnit
  | WeightUnit
  | UnknownUnit;

export const baseUnit: Unit = {
  unitId: baseNumId,
  metric: "unknown",
  desc: AppUnit.unknown,
};
