import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

export enum UL {
  lbs = "Lbs",
  flOz = "Fl Oz",
  ksf = "1000 SF",
  ea = "Ea",
  mGal = "Mixed Gal",
  sec = "Seconds",
  bulb = "Bulb Charge",
  ft = "Feet",
  unknown = "?",
}

export type UnitStorage = {
  unitId: number;
  metric: string;
  desc: string;
}

export type AreaUnit = {
  unitId: number;
  metric: "area";
  desc: UL.ksf;
};

export type CountUnit = {
  unitId: number;
  metric: "count";
  desc: UL.ea | UL.bulb;
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
