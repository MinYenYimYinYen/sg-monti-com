import { UnitUtils } from "./UnitUtils";
import {
  VolumeUnit,
  AreaUnit,
  LengthUnit,
  TimeUnit,
  WeightUnit,
  UnitLabel,
} from "./UnitTypes";

/**
 * Dimensional exponents for tracking compound units
 *
 * Each dimension represents an exponent in dimensional analysis:
 * - volume: 1 means "gallons", -1 means "per gallon"
 * - weight: 1 means "pounds", -1 means "per pound"
 * - length: 1 means "feet", 2 means "square feet", -1 means "per foot", -2 means "per square foot"
 * - time: 1 means "seconds", -1 means "per second"
 *
 * Examples:
 * - Speed (ft/sec): { length: 1, time: -1 }
 * - Area (ft²): { length: 2 }
 * - Flow rate (gal/min): { volume: 1, time: -1 }
 * - Weight rate (lbs/min): { weight: 1, time: -1 }
 * - Coverage (gal/ft²): { volume: 1, length: -2 }
 * - Coverage (lbs/ft²): { weight: 1, length: -2 }
 */
type Dimensions = {
  volume?: number;
  weight?: number;
  length?: number;
  time?: number;
};

/**
 * UnitMath: Dimensional analysis with automatic unit tracking
 *
 * This class enables math operations on quantities with different units while automatically
 * tracking dimensional changes. It uses the laws of exponents to handle multiplication and
 * division of compound units.
 *
 * Key concepts:
 * - Internally stores values in base units (gallons, feet, seconds)
 * - Tracks dimensions as exponents (e.g., length: 2 means "square feet")
 * - Multiply = add exponents, Divide = subtract exponents
 * - Can convert results back to any compatible units using UnitUtils
 *
 * @example
 * // Calculate coverage: (flowRate × overlap) / (groundSpeed × width)
 * const flowRate = UnitMath.volumeRate(3, AppUnit.mGal, 1, "minute");
 * const groundSpeed = UnitMath.distanceRate(90, AppUnit.ft, 17.5, AppUnit.sec);
 * const width = UnitMath.distance(11, AppUnit.ft);
 * const overlap = UnitMath.scalar(2);
 *
 * const coverage = flowRate
 *   .multiply(overlap)
 *   .divide(groundSpeed)
 *   .divide(width);
 *
 * const result = coverage.toVolumePerArea(AppUnit.mGal, AppUnit.ksf);
 * // Returns coverage in gallons per 1000 square feet
 */
export class UnitMath {
  /**
   * @param baseValue - The numeric value in base units (gallons, feet, seconds)
   * @param dimensions - The dimensional exponents for this quantity
   */
  private constructor(
    private baseValue: number,
    private dimensions: Dimensions
  ) {}

  // ========== Factory Methods ==========

  /**
   * Create a dimensionless scalar value
   *
   * @example
   * const overlap = UnitMath.scalar(2);
   */
  static scalar(value: number): UnitMath {
    return new UnitMath(value, {});
  }

  /**
   * Create a volume quantity
   *
   * @example
   * const volume = UnitMath.volume(5, AppUnit.mGal);
   */
  static volume(volume: number, volumeUnit: VolumeUnit["desc"]): UnitMath {
    const gallons = UnitUtils.volume(volume, volumeUnit).to(UnitLabel.mGal);
    return new UnitMath(gallons, { volume: 1 });
  }

  /**
   * Create a distance/length quantity
   *
   * @example
   * const width = UnitMath.distance(11, AppUnit.ft);
   */
  static distance(distance: number, distanceUnit: LengthUnit["desc"]): UnitMath {
    const feet = UnitUtils.distance(distance, distanceUnit).to(UnitLabel.ft);
    return new UnitMath(feet, { length: 1 });
  }

  /**
   * Create a time quantity
   *
   * @example
   * const duration = UnitMath.time(60, AppUnit.sec);
   */
  static time(time: number, timeUnit: TimeUnit["desc"]): UnitMath {
    const seconds = UnitUtils.time(time, timeUnit).to(UnitLabel.sec);
    return new UnitMath(seconds, { time: 1 });
  }

  /**
   * Create an area quantity
   *
   * @example
   * const area = UnitMath.area(1000, AppUnit.sf);
   */
  static area(area: number, areaUnit: AreaUnit["desc"]): UnitMath {
    const sqFeet = UnitUtils.area(area, areaUnit).to(UnitLabel.sf);
    return new UnitMath(sqFeet, { length: 2 });
  }

  /**
   * Create a volume rate (volume per time)
   *
   * @example
   * const flowRate = UnitMath.volumeRate(3, AppUnit.mGal, 1, AppUnit.sec);
   * // Represents 3 gallons per second
   */
  static volumeRate(
    volume: number,
    volumeUnit: VolumeUnit["desc"],
    time: number,
    timeUnit: TimeUnit["desc"]
  ): UnitMath {
    const gallons = UnitUtils.volume(volume, volumeUnit).to(UnitLabel.mGal);
    const seconds = UnitUtils.time(time, timeUnit).to(UnitLabel.sec);
    return new UnitMath(gallons / seconds, { volume: 1, time: -1 });
  }

  /**
   * Create a distance rate (distance per time)
   *
   * @example
   * const speed = UnitMath.distanceRate(90, AppUnit.ft, 17.5, AppUnit.sec);
   * // Represents 90 feet per 17.5 seconds
   */
  static distanceRate(
    distance: number,
    distanceUnit: LengthUnit["desc"],
    time: number,
    timeUnit: TimeUnit["desc"]
  ): UnitMath {
    const feet = UnitUtils.distance(distance, distanceUnit).to(UnitLabel.ft);
    const seconds = UnitUtils.time(time, timeUnit).to(UnitLabel.sec);
    return new UnitMath(feet / seconds, { length: 1, time: -1 });
  }

  /**
   * Create a volume per area quantity (application rate)
   *
   * @example
   * const rate = UnitMath.volumePerArea(0.25, AppUnit.mGal, 1000, AppUnit.sf);
   * // Represents 0.25 gallons per 1000 square feet
   */
  static volumePerArea(
    volume: number,
    volumeUnit: VolumeUnit["desc"],
    area: number,
    areaUnit: AreaUnit["desc"]
  ): UnitMath {
    const gallons = UnitUtils.volume(volume, volumeUnit).to(UnitLabel.mGal);
    const sqFeet = UnitUtils.area(area, areaUnit).to(UnitLabel.sf);
    return new UnitMath(gallons / sqFeet, { volume: 1, length: -2 });
  }

  /**
   * Create a weight quantity
   *
   * @example
   * const weight = UnitMath.weight(5, AppUnit.lbs);
   */
  static weight(weight: number, weightUnit: WeightUnit["desc"]): UnitMath {
    const lbs = UnitUtils.weight(weight, weightUnit).to(UnitLabel.lbs);
    return new UnitMath(lbs, { weight: 1 });
  }

  /**
   * Create a weight rate (weight per time)
   *
   * @example
   * const weightRate = UnitMath.weightRate(3, AppUnit.lbs, 1, AppUnit.sec);
   * // Represents 3 pounds per second
   */
  static weightRate(
    weight: number,
    weightUnit: WeightUnit["desc"],
    time: number,
    timeUnit: TimeUnit["desc"]
  ): UnitMath {
    const lbs = UnitUtils.weight(weight, weightUnit).to(UnitLabel.lbs);
    const seconds = UnitUtils.time(time, timeUnit).to(UnitLabel.sec);
    return new UnitMath(lbs / seconds, { weight: 1, time: -1 });
  }

  /**
   * Create a weight per area quantity (application rate)
   *
   * @example
   * const rate = UnitMath.weightPerArea(2, AppUnit.lbs, 1000, AppUnit.sf);
   * // Represents 2 pounds per 1000 square feet
   */
  static weightPerArea(
    weight: number,
    weightUnit: WeightUnit["desc"],
    area: number,
    areaUnit: AreaUnit["desc"]
  ): UnitMath {
    const lbs = UnitUtils.weight(weight, weightUnit).to(UnitLabel.lbs);
    const sqFeet = UnitUtils.area(area, areaUnit).to(UnitLabel.sf);
    return new UnitMath(lbs / sqFeet, { weight: 1, length: -2 });
  }

  // ========== Arithmetic Operations ==========

  /**
   * Multiply two quantities
   *
   * Uses the law of exponents: x^a × x^b = x^(a+b)
   *
   * @example
   * const speed = UnitMath.distance(10, AppUnit.ft).divide(UnitMath.time(1, AppUnit.sec));
   * // speed has dimensions { length: 1, time: -1 } (feet per second)
   */
  multiply(other: UnitMath): UnitMath {
    return new UnitMath(this.baseValue * other.baseValue, {
      volume: (this.dimensions.volume || 0) + (other.dimensions.volume || 0),
      weight: (this.dimensions.weight || 0) + (other.dimensions.weight || 0),
      length: (this.dimensions.length || 0) + (other.dimensions.length || 0),
      time: (this.dimensions.time || 0) + (other.dimensions.time || 0),
    });
  }

  /**
   * Divide two quantities
   *
   * Uses the law of exponents: x^a ÷ x^b = x^(a-b)
   *
   * @example
   * const flowRate = UnitMath.volume(5, AppUnit.mGal).divide(UnitMath.time(60, AppUnit.sec));
   * // flowRate has dimensions { volume: 1, time: -1 } (gallons per second)
   */
  divide(other: UnitMath): UnitMath {
    return new UnitMath(this.baseValue / other.baseValue, {
      volume: (this.dimensions.volume || 0) - (other.dimensions.volume || 0),
      weight: (this.dimensions.weight || 0) - (other.dimensions.weight || 0),
      length: (this.dimensions.length || 0) - (other.dimensions.length || 0),
      time: (this.dimensions.time || 0) - (other.dimensions.time || 0),
    });
  }

  // ========== Conversion Methods ==========

  /**
   * Get the raw base value and dimensions
   *
   * @returns Object with baseValue (in base units) and dimensions
   */
  getRaw(): { baseValue: number; dimensions: Dimensions } {
    return {
      baseValue: this.baseValue,
      dimensions: { ...this.dimensions },
    };
  }

  /**
   * Convert to a scalar value (dimensionless)
   *
   * @throws Error if the quantity has dimensions
   */
  toScalar(): number {
    const hasVolume = this.dimensions.volume && this.dimensions.volume !== 0;
    const hasWeight = this.dimensions.weight && this.dimensions.weight !== 0;
    const hasLength = this.dimensions.length && this.dimensions.length !== 0;
    const hasTime = this.dimensions.time && this.dimensions.time !== 0;

    if (hasVolume || hasWeight || hasLength || hasTime) {
      throw new Error(
        `Cannot convert to scalar: quantity has dimensions ${JSON.stringify(this.dimensions)}`
      );
    }

    return this.baseValue;
  }

  /**
   * Convert to volume in specified units
   *
   * @throws Error if dimensions are not { volume: 1 }
   */
  toVolume(volumeUnit: VolumeUnit["desc"]): number {
    if (this.dimensions.volume !== 1 || this.dimensions.length || this.dimensions.time) {
      throw new Error(
        `Cannot convert to volume: dimensions are ${JSON.stringify(this.dimensions)}, expected { volume: 1 }`
      );
    }

    return UnitUtils.volume(this.baseValue, UnitLabel.mGal).to(volumeUnit);
  }

  /**
   * Convert to distance in specified units
   *
   * @throws Error if dimensions are not { length: 1 }
   */
  toDistance(distanceUnit: LengthUnit["desc"]): number {
    if (this.dimensions.length !== 1 || this.dimensions.volume || this.dimensions.time) {
      throw new Error(
        `Cannot convert to distance: dimensions are ${JSON.stringify(this.dimensions)}, expected { length: 1 }`
      );
    }

    return UnitUtils.distance(this.baseValue, UnitLabel.ft).to(distanceUnit);
  }

  /**
   * Convert to time in specified units
   *
   * @throws Error if dimensions are not { time: 1 }
   */
  toTime(timeUnit: TimeUnit["desc"]): number {
    if (this.dimensions.time !== 1 || this.dimensions.volume || this.dimensions.length) {
      throw new Error(
        `Cannot convert to time: dimensions are ${JSON.stringify(this.dimensions)}, expected { time: 1 }`
      );
    }

    return UnitUtils.time(this.baseValue, UnitLabel.sec).to(timeUnit);
  }

  /**
   * Convert to area in specified units
   *
   * @throws Error if dimensions are not { length: 2 }
   */
  toArea(areaUnit: AreaUnit["desc"]): number {
    if (this.dimensions.length !== 2 || this.dimensions.volume || this.dimensions.time) {
      throw new Error(
        `Cannot convert to area: dimensions are ${JSON.stringify(this.dimensions)}, expected { length: 2 }`
      );
    }

    return UnitUtils.area(this.baseValue, UnitLabel.sf).to(areaUnit);
  }

  /**
   * Convert to volume per area (application coverage rate)
   *
   * @throws Error if dimensions are not { volume: 1, length: -2 }
   *
   * @example
   * const coverage = flowRate.multiply(overlap).divide(groundSpeed).divide(width);
   * const gallonsPer1000SqFt = coverage.toVolumePerArea(AppUnit.mGal, AppUnit.ksf);
   */
  toVolumePerArea(volumeUnit: VolumeUnit["desc"], areaUnit: AreaUnit["desc"]): number {
    if (
      this.dimensions.volume !== 1 ||
      this.dimensions.length !== -2 ||
      this.dimensions.time
    ) {
      throw new Error(
        `Cannot convert to volume per area: dimensions are ${JSON.stringify(this.dimensions)}, expected { volume: 1, length: -2 }`
      );
    }

    // baseValue is in gallons per square foot
    // Convert volume part
    const volumeInTargetUnit = UnitUtils.volume(this.baseValue, UnitLabel.mGal).to(volumeUnit);

    // Convert area part: we have "per 1 sqft", need "per X areaUnit"
    const sqFtPerTargetAreaUnit = UnitUtils.area(1, areaUnit).to(UnitLabel.sf);

    return volumeInTargetUnit * sqFtPerTargetAreaUnit;
  }

  /**
   * Convert to volume rate (volume per time)
   *
   * @throws Error if dimensions are not { volume: 1, time: -1 }
   *
   * @example
   * const flowRate = UnitMath.volume(5, AppUnit.mGal).divide(UnitMath.time(60, AppUnit.sec));
   * const gpm = flowRate.toVolumeRate(AppUnit.mGal, "minutes");
   */
  toVolumeRate(volumeUnit: VolumeUnit["desc"], timeUnit: TimeUnit["desc"]): number {
    if (
      this.dimensions.volume !== 1 ||
      this.dimensions.time !== -1 ||
      this.dimensions.length
    ) {
      throw new Error(
        `Cannot convert to volume rate: dimensions are ${JSON.stringify(this.dimensions)}, expected { volume: 1, time: -1 }`
      );
    }

    // baseValue is in gallons per second
    const volumeInTargetUnit = UnitUtils.volume(this.baseValue, UnitLabel.mGal).to(volumeUnit);
    const secondsPerTargetTimeUnit = UnitUtils.time(1, timeUnit).to(UnitLabel.sec);

    return volumeInTargetUnit * secondsPerTargetTimeUnit;
  }

  /**
   * Convert to distance rate (distance per time)
   *
   * @throws Error if dimensions are not { length: 1, time: -1 }
   *
   * @example
   * const speed = UnitMath.distance(90, AppUnit.ft).divide(UnitMath.time(17.5, AppUnit.sec));
   * const feetPerSecond = speed.toDistanceRate(AppUnit.ft, AppUnit.sec);
   */
  toDistanceRate(distanceUnit: LengthUnit["desc"], timeUnit: TimeUnit["desc"]): number {
    if (
      this.dimensions.length !== 1 ||
      this.dimensions.time !== -1 ||
      this.dimensions.volume ||
      this.dimensions.weight
    ) {
      throw new Error(
        `Cannot convert to distance rate: dimensions are ${JSON.stringify(this.dimensions)}, expected { length: 1, time: -1 }`
      );
    }

    // baseValue is in feet per second
    const distanceInTargetUnit = UnitUtils.distance(this.baseValue, UnitLabel.ft).to(distanceUnit);
    const secondsPerTargetTimeUnit = UnitUtils.time(1, timeUnit).to(UnitLabel.sec);

    return distanceInTargetUnit * secondsPerTargetTimeUnit;
  }

  /**
   * Convert to weight in specified units
   *
   * @throws Error if dimensions are not { weight: 1 }
   */
  toWeight(weightUnit: WeightUnit["desc"]): number {
    if (this.dimensions.weight !== 1 || this.dimensions.length || this.dimensions.time || this.dimensions.volume) {
      throw new Error(
        `Cannot convert to weight: dimensions are ${JSON.stringify(this.dimensions)}, expected { weight: 1 }`
      );
    }

    return UnitUtils.weight(this.baseValue, UnitLabel.lbs).to(weightUnit);
  }

  /**
   * Convert to weight rate (weight per time)
   *
   * @throws Error if dimensions are not { weight: 1, time: -1 }
   *
   * @example
   * const weightRate = UnitMath.weight(5, AppUnit.lbs).divide(UnitMath.time(60, AppUnit.sec));
   * const lbsPerMin = weightRate.toWeightRate(AppUnit.lbs, AppUnit.min);
   */
  toWeightRate(weightUnit: WeightUnit["desc"], timeUnit: TimeUnit["desc"]): number {
    if (
      this.dimensions.weight !== 1 ||
      this.dimensions.time !== -1 ||
      this.dimensions.length ||
      this.dimensions.volume
    ) {
      throw new Error(
        `Cannot convert to weight rate: dimensions are ${JSON.stringify(this.dimensions)}, expected { weight: 1, time: -1 }`
      );
    }

    // baseValue is in pounds per second
    const weightInTargetUnit = UnitUtils.weight(this.baseValue, UnitLabel.lbs).to(weightUnit);
    const secondsPerTargetTimeUnit = UnitUtils.time(1, timeUnit).to(UnitLabel.sec);

    return weightInTargetUnit * secondsPerTargetTimeUnit;
  }

  /**
   * Convert to weight per area (application coverage rate)
   *
   * @throws Error if dimensions are not { weight: 1, length: -2 }
   *
   * @example
   * const coverage = weightRate.multiply(overlap).divide(groundSpeed).divide(width);
   * const lbsPer1000SqFt = coverage.toWeightPerArea(AppUnit.lbs, AppUnit.ksf);
   */
  toWeightPerArea(weightUnit: WeightUnit["desc"], areaUnit: AreaUnit["desc"]): number {
    if (
      this.dimensions.weight !== 1 ||
      this.dimensions.length !== -2 ||
      this.dimensions.time ||
      this.dimensions.volume
    ) {
      throw new Error(
        `Cannot convert to weight per area: dimensions are ${JSON.stringify(this.dimensions)}, expected { weight: 1, length: -2 }`
      );
    }

    // baseValue is in pounds per square foot
    // Convert weight part
    const weightInTargetUnit = UnitUtils.weight(this.baseValue, UnitLabel.lbs).to(weightUnit);

    // Convert area part: we have "per 1 sqft", need "per X areaUnit"
    const sqFtPerTargetAreaUnit = UnitUtils.area(1, areaUnit).to(UnitLabel.sf);

    return weightInTargetUnit * sqFtPerTargetAreaUnit;
  }
}
