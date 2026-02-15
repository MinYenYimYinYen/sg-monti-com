import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

export enum UL {
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

export const UL_METRIC_MAP: Record<UL, Metric> = {
  [UL.ksf]: "area",
  [UL.ea]: "count",
  [UL.bulb]: "count",
  [UL.dot]: "count",
  [UL.ft]: "length",
  [UL.sec]: "time",
  [UL.mGal]: "volume",
  [UL.flOz]: "volume",
  [UL.lbs]: "weight",
  [UL.unknown]: "unknown",
};

export function getMetricForUL(ul: UL): Metric {
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
  desc: UL.ksf;
};

export type CountUnit = {
  unitId: number;
  metric: "count";
  desc: UL.ea | UL.bulb | UL.dot;
};

export type LengthUnit = {
  unitId: number;
  metric: "length";
  desc: UL.ft;
};

export type TimeUnit = {
  unitId: number;
  metric: "time";
  desc: UL.sec;
};

export type VolumeUnit = {
  unitId: number;
  metric: "volume";
  desc: UL.mGal | UL.flOz;
};

export type WeightUnit = {
  unitId: number;
  metric: "weight";
  desc: UL.lbs;
};

type UnknownUnit = {
  unitId: number;
  metric: "unknown";
  desc: UL.unknown;
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
  desc: UL.unknown,
};
