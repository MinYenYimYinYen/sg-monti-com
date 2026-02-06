export enum UL {
  lbs = "Lbs",
  flOz = "Fl Oz",
  ksf = "1000 SF",
  ea = "Ea",
  mGal = "Mixed Gal",
  sec = "Seconds",
  bulb = "Bulb Charge",
  ft = "Feet",
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
}

export type WeightUnit = {
  unitId: number;
  metric: "weight";
  desc: UL.lbs;
};

export type Unit = AreaUnit | CountUnit | LengthUnit | TimeUnit | WeightUnit;
