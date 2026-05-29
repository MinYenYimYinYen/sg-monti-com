import {
  AreaUnit,
  LengthUnit,
  Metric,
  TimeUnit,
  UnitLabel,
  UL_METRIC_MAP,
  VolumeUnit,
  WeightUnit,
} from "@/app/realGreen/product/unitConfig/UnitTypes";

/**
 * Converter interface for volume units with call signature and metadata methods
 */
interface VolumeConverter {
  (
    value: number,
    fromUnit: VolumeUnit["desc"],
  ): {
    to: (toUnit: VolumeUnit["desc"]) => number;
    toAll: () => { [K in VolumeUnit["desc"]]: number };
  };
  getAllUnits(): VolumeUnit["desc"][];
  getConversionFactors(): { [K in VolumeUnit["desc"]]: number };
}

/**
 * Converter interface for area units with call signature and metadata methods
 */
interface AreaConverter {
  (
    value: number,
    fromUnit: AreaUnit["desc"],
  ): {
    to: (toUnit: AreaUnit["desc"]) => number;
    toAll: () => { [K in AreaUnit["desc"]]: number };
  };
  getAllUnits(): AreaUnit["desc"][];
  getConversionFactors(): { [K in AreaUnit["desc"]]: number };
}

/**
 * Converter interface for distance/length units with call signature and metadata methods
 */
interface DistanceConverter {
  (
    value: number,
    fromUnit: LengthUnit["desc"],
  ): {
    to: (toUnit: LengthUnit["desc"]) => number;
    toAll: () => { [K in LengthUnit["desc"]]: number };
  };
  getAllUnits(): LengthUnit["desc"][];
  getConversionFactors(): { [K in LengthUnit["desc"]]: number };
}

/**
 * Converter interface for time units with call signature and metadata methods
 */
interface TimeConverter {
  (
    value: number,
    fromUnit: TimeUnit["desc"],
  ): {
    to: (toUnit: TimeUnit["desc"]) => number;
    toAll: () => { [K in TimeUnit["desc"]]: number };
  };
  getAllUnits(): TimeUnit["desc"][];
  getConversionFactors(): { [K in TimeUnit["desc"]]: number };
}

/**
 * Converter interface for weight units with call signature and metadata methods
 */
interface WeightConverter {
  (
    value: number,
    fromUnit: WeightUnit["desc"],
  ): {
    to: (toUnit: WeightUnit["desc"]) => number;
    toAll: () => { [K in WeightUnit["desc"]]: number };
  };
  getAllUnits(): WeightUnit["desc"][];
  getConversionFactors(): { [K in WeightUnit["desc"]]: number };
}

/**
 * Type-safe unit conversion and metadata utilities
 */
export class UnitUtils {
  private static readonly VOLUME_UNITS = [
    UnitLabel.mGal,
    UnitLabel.flOz,
  ] as const satisfies VolumeUnit["desc"][];

  // Volume conversions (to gallons)
  private static readonly VOLUME_TO_GALLONS: Record<
    VolumeUnit["desc"],
    number
  > = {
    [UnitLabel.mGal]: 1,
    [UnitLabel.flOz]: 1 / 128,
  };
  /**
   * Volume converter with fluent API
   *
   * @example
   * // Convert 5 gallons to fluid ounces
   * UnitUtils.volume(5, AppUnit.mGal).to(AppUnit.flOz)  // 640
   *
   * @example
   * // Get all conversions
   * UnitUtils.volume(5, AppUnit.mGal).toAll()  // { "Gal": 5, "Fl Oz": 640 }
   *
   * @example
   * // Get all available units
   * UnitUtils.volume.getAllUnits()  // ["Gal", "Fl Oz"]
   */
  static readonly volume: VolumeConverter = Object.assign(
    (value: number, fromUnit: VolumeUnit["desc"]) => {
      const gallons = value * UnitUtils.VOLUME_TO_GALLONS[fromUnit];

      return {
        to: (toUnit: VolumeUnit["desc"]): number => {
          return gallons / UnitUtils.VOLUME_TO_GALLONS[toUnit];
        },

        toAll: (): { [K in VolumeUnit["desc"]]: number } => {
          return {
            [UnitLabel.mGal]:
              gallons / UnitUtils.VOLUME_TO_GALLONS[UnitLabel.mGal],
            [UnitLabel.flOz]:
              gallons / UnitUtils.VOLUME_TO_GALLONS[UnitLabel.flOz],
          };
        },
      };
    },
    {
      getAllUnits: (): VolumeUnit["desc"][] => UnitUtils.VOLUME_UNITS,
      getConversionFactors: (): { [K in VolumeUnit["desc"]]: number } => ({
        [UnitLabel.mGal]: UnitUtils.VOLUME_TO_GALLONS[UnitLabel.mGal],
        [UnitLabel.flOz]: UnitUtils.VOLUME_TO_GALLONS[UnitLabel.flOz],
      }),
    },
  );
  private static readonly AREA_UNITS = [
    UnitLabel.sf,
    UnitLabel.ksf,
  ] as const satisfies AreaUnit["desc"][];

  // Area conversions (to square feet)
  private static readonly AREA_TO_SQ_FT: Record<AreaUnit["desc"], number> = {
    [UnitLabel.sf]: 1,
    [UnitLabel.ksf]: 1000,
  };
  /**
   * Area converter with fluent API
   *
   * @example
   * // Convert 1000 sq ft to 1000 SF units
   * UnitUtils.area(1, AppUnit.sf).to(AppUnit.ksf)  // 0.001
   *
   * @example
   * // Get all conversions
   * UnitUtils.area(1500, AppUnit.sf).toAll()  // { "SF": 1500, "1000 SF": 1.5 }
   *
   * @example
   * // Get all available units
   * UnitUtils.area.getAllUnits()  // ["SF", "1000 SF"]
   */
  static readonly area: AreaConverter = Object.assign(
    (value: number, fromUnit: AreaUnit["desc"]) => {
      const sqFt = value * UnitUtils.AREA_TO_SQ_FT[fromUnit];

      return {
        to: (toUnit: AreaUnit["desc"]): number => {
          return sqFt / UnitUtils.AREA_TO_SQ_FT[toUnit];
        },

        toAll: (): { [K in AreaUnit["desc"]]: number } => {
          return {
            [UnitLabel.sf]: sqFt / UnitUtils.AREA_TO_SQ_FT[UnitLabel.sf],
            [UnitLabel.ksf]: sqFt / UnitUtils.AREA_TO_SQ_FT[UnitLabel.ksf],
          };
        },
      };
    },
    {
      getAllUnits: (): AreaUnit["desc"][] => UnitUtils.AREA_UNITS,
      getConversionFactors: (): { [K in AreaUnit["desc"]]: number } => ({
        [UnitLabel.sf]: UnitUtils.AREA_TO_SQ_FT[UnitLabel.sf],
        [UnitLabel.ksf]: UnitUtils.AREA_TO_SQ_FT[UnitLabel.ksf],
      }),
    },
  );
  private static readonly LENGTH_UNITS = [
    UnitLabel.ft,
    UnitLabel.miles,
  ] as const satisfies LengthUnit["desc"][];

  // Length conversions (to feet)
  private static readonly LENGTH_TO_FEET: Record<LengthUnit["desc"], number> = {
    [UnitLabel.ft]: 1,
    [UnitLabel.miles]: 5280,
  };
  /**
   * Distance converter with fluent API
   *
   * @example
   * // Convert feet to miles
   * UnitUtils.distance(5280, AppUnit.ft).to(AppUnit.miles)  // 1
   *
   * @example
   * // Get all available units
   * UnitUtils.distance.getAllUnits()  // ["Feet", "Miles"]
   */
  static readonly distance: DistanceConverter = Object.assign(
    (value: number, fromUnit: LengthUnit["desc"]) => {
      const feet = value * UnitUtils.LENGTH_TO_FEET[fromUnit];

      return {
        to: (toUnit: LengthUnit["desc"]): number => {
          return feet / UnitUtils.LENGTH_TO_FEET[toUnit];
        },

        toAll: (): { [K in LengthUnit["desc"]]: number } => {
          return {
            [UnitLabel.ft]: feet / UnitUtils.LENGTH_TO_FEET[UnitLabel.ft],
            [UnitLabel.miles]: feet / UnitUtils.LENGTH_TO_FEET[UnitLabel.miles],
          };
        },
      };
    },
    {
      getAllUnits: (): LengthUnit["desc"][] => UnitUtils.LENGTH_UNITS,
      getConversionFactors: (): { [K in LengthUnit["desc"]]: number } => ({
        [UnitLabel.ft]: UnitUtils.LENGTH_TO_FEET[UnitLabel.ft],
        [UnitLabel.miles]: UnitUtils.LENGTH_TO_FEET[UnitLabel.miles],
      }),
    },
  );

  private static readonly TIME_UNITS = [
    UnitLabel.sec,
    UnitLabel.min,
    UnitLabel.hr,
  ] as const satisfies TimeUnit["desc"][];

  // Time conversions (to seconds)
  private static readonly TIME_TO_SECONDS: Record<TimeUnit["desc"], number> = {
    [UnitLabel.sec]: 1,
    [UnitLabel.min]: 60,
    [UnitLabel.hr]: 3600,
  };
  /**
   * Time converter with fluent API
   *
   * @example
   * // Convert hours to seconds
   * UnitUtils.time(1, AppUnit.hr).to(AppUnit.sec)  // 3600
   *
   * @example
   * // Get all available units
   * UnitUtils.time.getAllUnits()  // ["Seconds", "Minutes", "Hours"]
   */
  static readonly time: TimeConverter = Object.assign(
    (value: number, fromUnit: TimeUnit["desc"]) => {
      const seconds = value * UnitUtils.TIME_TO_SECONDS[fromUnit];

      return {
        to: (toUnit: TimeUnit["desc"]): number => {
          return seconds / UnitUtils.TIME_TO_SECONDS[toUnit];
        },

        toAll: (): { [K in TimeUnit["desc"]]: number } => {
          return {
            [UnitLabel.sec]: seconds / UnitUtils.TIME_TO_SECONDS[UnitLabel.sec],
            [UnitLabel.min]: seconds / UnitUtils.TIME_TO_SECONDS[UnitLabel.min],
            [UnitLabel.hr]: seconds / UnitUtils.TIME_TO_SECONDS[UnitLabel.hr],
          };
        },
      };
    },
    {
      getAllUnits: (): TimeUnit["desc"][] => UnitUtils.TIME_UNITS,
      getConversionFactors: (): { [K in TimeUnit["desc"]]: number } => ({
        [UnitLabel.sec]: UnitUtils.TIME_TO_SECONDS[UnitLabel.sec],
        [UnitLabel.min]: UnitUtils.TIME_TO_SECONDS[UnitLabel.min],
        [UnitLabel.hr]: UnitUtils.TIME_TO_SECONDS[UnitLabel.hr],
      }),
    },
  );
  private static readonly WEIGHT_UNITS = [
    UnitLabel.lbs,
  ] as const satisfies WeightUnit["desc"][];

  // Weight conversions (to pounds)
  private static readonly WEIGHT_TO_LBS: Record<WeightUnit["desc"], number> = {
    [UnitLabel.lbs]: 1,
  };
  /**
   * Weight converter with fluent API
   *
   * @example
   * // Convert pounds (currently only one unit)
   * UnitUtils.weight(5, AppUnit.lbs).to(AppUnit.lbs)  // 5
   *
   * @example
   * // Get all available units
   * UnitUtils.weight.getAllUnits()  // ["Lbs"]
   */
  static readonly weight: WeightConverter = Object.assign(
    (value: number, fromUnit: WeightUnit["desc"]) => {
      const lbs = value * UnitUtils.WEIGHT_TO_LBS[fromUnit];

      return {
        to: (toUnit: WeightUnit["desc"]): number => {
          return lbs / UnitUtils.WEIGHT_TO_LBS[toUnit];
        },

        toAll: (): { [K in WeightUnit["desc"]]: number } => {
          return {
            [UnitLabel.lbs]: lbs / UnitUtils.WEIGHT_TO_LBS[UnitLabel.lbs],
          };
        },
      };
    },
    {
      getAllUnits: (): WeightUnit["desc"][] => UnitUtils.WEIGHT_UNITS,
      getConversionFactors: (): { [K in WeightUnit["desc"]]: number } => ({
        [UnitLabel.lbs]: UnitUtils.WEIGHT_TO_LBS[UnitLabel.lbs],
      }),
    },
  );

  /**
   * Convert volume per area (application rate) between units
   *
   * @example
   * // Convert 2 Gal/1000sf to Fl Oz/1000sf
   * UnitUtils.convertVolumePerArea(2, AppUnit.mGal, AppUnit.ksf, AppUnit.flOz, AppUnit.ksf)
   * // Returns: 256
   */
  static convertVolumePerArea(
    value: number,
    fromVolumeUnit: VolumeUnit["desc"],
    fromAreaUnit: AreaUnit["desc"],
    toVolumeUnit: VolumeUnit["desc"],
    toAreaUnit: AreaUnit["desc"],
  ): number {
    // Convert to base units (gallons per square foot)
    const gallons = value * this.VOLUME_TO_GALLONS[fromVolumeUnit];
    const sqFt = this.AREA_TO_SQ_FT[fromAreaUnit];
    const gallonsPerSqFt = gallons / sqFt;

    // Convert to target units
    const targetSqFt = this.AREA_TO_SQ_FT[toAreaUnit];
    const targetGallons = gallonsPerSqFt * targetSqFt;
    return targetGallons / this.VOLUME_TO_GALLONS[toVolumeUnit];
  }

  /**
   * Convert volume rate (volume per time) between compound units
   *
   * @example
   * // Convert 0.0070714 gal/1sec to fl oz/30sec
   * UnitUtils.convertVolumeRate(
   *   0.0070714, AppUnit.mGal, 1, AppUnit.sec,
   *   AppUnit.flOz, 30, AppUnit.sec
   * )
   * // Returns: ~27.3 (fl oz per 30 seconds)
   */
  static convertVolumeRate(
    value: number,
    fromVolumeUnit: VolumeUnit["desc"],
    fromTime: number,
    fromTimeUnit: TimeUnit["desc"],
    toVolumeUnit: VolumeUnit["desc"],
    toTime: number,
    toTimeUnit: TimeUnit["desc"],
  ): number {
    // Convert to base rate (gallons per second)
    const gallons = value * this.VOLUME_TO_GALLONS[fromVolumeUnit];
    const fromSeconds = fromTime * this.TIME_TO_SECONDS[fromTimeUnit];
    const gallonsPerSecond = gallons / fromSeconds;

    // Convert to target rate
    const toSeconds = toTime * this.TIME_TO_SECONDS[toTimeUnit];
    const targetGallons = gallonsPerSecond * toSeconds;
    return targetGallons / this.VOLUME_TO_GALLONS[toVolumeUnit];
  }

  /**
   * Convert weight per area (application rate) between units
   *
   * @example
   * // Convert 2 Lbs/1000sf to Lbs/SF
   * UnitUtils.convertWeightPerArea(2, AppUnit.lbs, AppUnit.ksf, AppUnit.lbs, AppUnit.sf)
   * // Returns: 0.002
   */
  static convertWeightPerArea(
    value: number,
    fromWeightUnit: WeightUnit["desc"],
    fromAreaUnit: AreaUnit["desc"],
    toWeightUnit: WeightUnit["desc"],
    toAreaUnit: AreaUnit["desc"],
  ): number {
    // Convert to base units (pounds per square foot)
    const lbs = value * this.WEIGHT_TO_LBS[fromWeightUnit];
    const sqFt = this.AREA_TO_SQ_FT[fromAreaUnit];
    const lbsPerSqFt = lbs / sqFt;

    // Convert to target units
    const targetSqFt = this.AREA_TO_SQ_FT[toAreaUnit];
    const targetLbs = lbsPerSqFt * targetSqFt;
    return targetLbs / this.WEIGHT_TO_LBS[toWeightUnit];
  }

  /**
   * Convert weight rate (weight per time) between compound units
   *
   * @example
   * // Convert 5 lbs/1min to lbs/60sec
   * UnitUtils.convertWeightRate(
   *   5, AppUnit.lbs, 1, AppUnit.min,
   *   AppUnit.lbs, 60, AppUnit.sec
   * )
   * // Returns: 5 (lbs per 60 seconds)
   */
  static convertWeightRate(
    value: number,
    fromWeightUnit: WeightUnit["desc"],
    fromTime: number,
    fromTimeUnit: TimeUnit["desc"],
    toWeightUnit: WeightUnit["desc"],
    toTime: number,
    toTimeUnit: TimeUnit["desc"],
  ): number {
    // Convert to base rate (pounds per second)
    const lbs = value * this.WEIGHT_TO_LBS[fromWeightUnit];
    const fromSeconds = fromTime * this.TIME_TO_SECONDS[fromTimeUnit];
    const lbsPerSecond = lbs / fromSeconds;

    // Convert to target rate
    const toSeconds = toTime * this.TIME_TO_SECONDS[toTimeUnit];
    const targetLbs = lbsPerSecond * toSeconds;
    return targetLbs / this.WEIGHT_TO_LBS[toWeightUnit];
  }

  /**
   * Finds the most human-readable (canonical) unit for a given quantity in app/base units.
   *
   * Selects the largest unit where the converted value is ≥ 1. This is sometimes called
   * "best-fit" or "canonical form" — the same principle used in measurement systems to
   * prefer "2.5 Gal" over "320 Fl Oz" when both represent the same quantity.
   *
   * Only considers units defined in UL_METRIC_MAP for the given metric. If no unit yields
   * a value ≥ 1, falls back to the smallest unit (the one with the smallest conversion factor).
   *
   * @example
   * UnitUtils.bestFitUnit(320, "volume")
   * // → { unit: UnitLabel.mGal, value: 2.5 }  (320 Fl Oz = 2.5 Gal)
   *
   * @example
   * UnitUtils.bestFitUnit(0.5, "volume")
   * // → { unit: UnitLabel.flOz, value: 0.5 }  (fallback — nothing ≥ 1 in app units)
   */
  static bestFitUnit(
    quantity: number,
    fromUnit: UnitLabel,
    metric: Metric,
  ): { unit: UnitLabel; value: number } {
    // Gather all UnitLabel values that belong to this metric
    const candidates = (Object.entries(UL_METRIC_MAP) as [UnitLabel, Metric][])
      .filter(([, m]) => m === metric)
      .map(([label]) => label);

    if (candidates.length === 0) {
      return { unit: UnitLabel.unknown, value: quantity };
    }

    // Build a list of { unit, factor } where factor is the metric's internal base unit
    // equivalent per 1 of that unit (e.g. VOLUME_TO_GALLONS["Fl Oz"] = 1/128).
    // We also compute the fromUnit's factor so we can normalize the input quantity.
    const getBaseFactor = (unit: UnitLabel): number => {
      switch (metric) {
        case "volume":
          return UnitUtils.VOLUME_TO_GALLONS[unit as VolumeUnit["desc"]] ?? 1;
        case "weight":
          return UnitUtils.WEIGHT_TO_LBS[unit as WeightUnit["desc"]] ?? 1;
        case "length":
          return UnitUtils.LENGTH_TO_FEET[unit as LengthUnit["desc"]] ?? 1;
        case "time":
          return UnitUtils.TIME_TO_SECONDS[unit as TimeUnit["desc"]] ?? 1;
        case "area":
          return UnitUtils.AREA_TO_SQ_FT[unit as AreaUnit["desc"]] ?? 1;
        default:
          return 1;
      }
    };

    // Convert input quantity to the metric's internal base unit
    const fromFactor = getBaseFactor(fromUnit);
    const quantityInBase = quantity * fromFactor;

    const withFactors = candidates.map((unit) => ({ unit, factor: getBaseFactor(unit) }));

    // Sort largest unit first (highest factor = largest unit)
    withFactors.sort((a, b) => b.factor - a.factor);

    // Find the largest unit where the converted value is ≥ 1
    for (const { unit, factor } of withFactors) {
      const converted = quantityInBase / factor;
      if (converted >= 1) {
        return { unit, value: converted };
      }
    }

    // Fallback: use the smallest unit (last in sorted list)
    const smallest = withFactors[withFactors.length - 1];
    return { unit: smallest.unit, value: quantityInBase / smallest.factor };
  }

  /**
   * Convert distance rate (distance per time) between compound units
   *
   * @example
   * // Convert 90 ft/17.5sec to ft/60sec
   * UnitUtils.convertDistanceRate(
   *   90, AppUnit.ft, 17.5, AppUnit.sec,
   *   AppUnit.ft, 60, AppUnit.sec
   * )
   * // Returns: ~308.6 (feet per 60 seconds)
   */
  static convertDistanceRate({
    value,
    fromDistanceUnit,
    fromTime,
    fromTimeUnit,
    toDistanceUnit,
    toTime,
    toTimeUnit,
  }: {
    value: number;
    fromDistanceUnit: LengthUnit["desc"];
    fromTime: number;
    fromTimeUnit: TimeUnit["desc"];
    toDistanceUnit: LengthUnit["desc"];
    toTime: number;
    toTimeUnit: TimeUnit["desc"];
  }): number {
    // Convert to base rate (feet per second)
    const feet = value * this.LENGTH_TO_FEET[fromDistanceUnit];
    const fromSeconds = fromTime * this.TIME_TO_SECONDS[fromTimeUnit];
    const feetPerSecond = feet / fromSeconds;

    // Convert to target rate
    const toSeconds = toTime * this.TIME_TO_SECONDS[toTimeUnit];
    const targetFeet = feetPerSecond * toSeconds;
    return targetFeet / this.LENGTH_TO_FEET[toDistanceUnit];
  }
}
