import {
  AppUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
  VolumeUnit,
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
 * Type-safe unit conversion and metadata utilities
 */
export class UnitUtils {
  // Volume conversions (to gallons)
  private static readonly VOLUME_TO_GALLONS: Record<
    VolumeUnit["desc"],
    number
  > = {
    [AppUnit.mGal]: 1,
    [AppUnit.flOz]: 1 / 128,
  };

  // Area conversions (to square feet)
  private static readonly AREA_TO_SQ_FT: Record<AreaUnit["desc"], number> = {
    [AppUnit.sf]: 1,
    [AppUnit.ksf]: 1000,
  };

  // Length conversions (to feet)
  private static readonly LENGTH_TO_FEET: Record<LengthUnit["desc"], number> = {
    [AppUnit.ft]: 1,
  };

  // Time conversions (to seconds)
  private static readonly TIME_TO_SECONDS: Record<TimeUnit["desc"], number> = {
    [AppUnit.sec]: 1,
    [AppUnit.min]: 60,
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
   * UnitUtils.volume(5, AppUnit.mGal).toAll()  // { "Mixed Gal": 5, "Fl Oz": 640 }
   *
   * @example
   * // Get all available units
   * UnitUtils.volume.getAllUnits()  // ["Mixed Gal", "Fl Oz"]
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
            [AppUnit.mGal]: gallons / UnitUtils.VOLUME_TO_GALLONS[AppUnit.mGal],
            [AppUnit.flOz]: gallons / UnitUtils.VOLUME_TO_GALLONS[AppUnit.flOz],
          };
        },
      };
    },
    {
      getAllUnits: (): VolumeUnit["desc"][] => [AppUnit.mGal, AppUnit.flOz],
      getConversionFactors: (): { [K in VolumeUnit["desc"]]: number } => ({
        [AppUnit.mGal]: UnitUtils.VOLUME_TO_GALLONS[AppUnit.mGal],
        [AppUnit.flOz]: UnitUtils.VOLUME_TO_GALLONS[AppUnit.flOz],
      }),
    },
  );

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
            [AppUnit.sf]: sqFt / UnitUtils.AREA_TO_SQ_FT[AppUnit.sf],
            [AppUnit.ksf]: sqFt / UnitUtils.AREA_TO_SQ_FT[AppUnit.ksf],
          };
        },
      };
    },
    {
      getAllUnits: (): AreaUnit["desc"][] => [AppUnit.sf, AppUnit.ksf],
      getConversionFactors: (): { [K in AreaUnit["desc"]]: number } => ({
        [AppUnit.sf]: UnitUtils.AREA_TO_SQ_FT[AppUnit.sf],
        [AppUnit.ksf]: UnitUtils.AREA_TO_SQ_FT[AppUnit.ksf],
      }),
    },
  );

  /**
   * Distance converter with fluent API
   *
   * @example
   * // Convert feet (currently only one unit)
   * UnitUtils.distance(10, AppUnit.ft).to(AppUnit.ft)  // 10
   *
   * @example
   * // Get all available units
   * UnitUtils.distance.getAllUnits()  // ["Feet"]
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
            [AppUnit.ft]: feet / UnitUtils.LENGTH_TO_FEET[AppUnit.ft],
          };
        },
      };
    },
    {
      getAllUnits: (): LengthUnit["desc"][] => [AppUnit.ft],
      getConversionFactors: (): { [K in LengthUnit["desc"]]: number } => ({
        [AppUnit.ft]: UnitUtils.LENGTH_TO_FEET[AppUnit.ft],
      }),
    },
  );

  /**
   * Time converter with fluent API
   *
   * @example
   * // Convert seconds (currently only one unit)
   * UnitUtils.time(60, AppUnit.sec).to(AppUnit.sec)  // 60
   *
   * @example
   * // Get all available units
   * UnitUtils.time.getAllUnits()  // ["Seconds"]
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
            [AppUnit.sec]: seconds / UnitUtils.TIME_TO_SECONDS[AppUnit.sec],
            [AppUnit.min]: seconds / UnitUtils.TIME_TO_SECONDS[AppUnit.min],
          };
        },
      };
    },
    {
      getAllUnits: (): TimeUnit["desc"][] => [AppUnit.sec, AppUnit.min],
      getConversionFactors: (): { [K in TimeUnit["desc"]]: number } => ({
        [AppUnit.sec]: UnitUtils.TIME_TO_SECONDS[AppUnit.sec],
        [AppUnit.min]: UnitUtils.TIME_TO_SECONDS[AppUnit.min],
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
