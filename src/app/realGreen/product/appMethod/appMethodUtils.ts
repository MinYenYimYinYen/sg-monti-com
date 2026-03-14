import { VolumeUnit } from "@/app/realGreen/product/_lib/types/UnitTypes";

/**
 * Calculates carrier application rate from AppMethod parameters.
 *
 * This function computes the application rate for liquid carriers (e.g., water) based on
 * machine settings and physical coverage area. The rate is returned in flowRateUnit per 1000 ft²,
 * which should match the carrier product's "app" context unit.
 *
 * @param params - Calculation parameters
 * @param params.sec90Feet - Time in seconds to travel 90 feet (higher = slower)
 * @param params.doubleOverlap - Whether the application pattern has double overlap
 * @param params.width - Application width in feet
 * @param params.flowRate - Flow rate per minute in flowRateUnit
 * @param params.flowRateUnit - Volume unit for flowRate (must match carrier's app unit)
 *
 * @returns Application rate in flowRateUnit per 1000 ft²
 *
 * @throws {Error} If flowRateUnit is not a volume unit
 *
 * @example
 * // Flow rate is 3 Mixed Gal/min
 * calculateCarrierRate({
 *   sec90Feet: 17.5,
 *   doubleOverlap: false,
 *   width: 11,
 *   flowRate: 3,
 *   flowRateUnit: { unitId: 20, metric: "volume", desc: "Mixed Gal" }
 * });
 * // Returns: ~1.74 Mixed Gal/1000 ft²
 *
 * Formula derivation:
 * - volumePerSec = flowRate / 60 (volume/sec from volume/min)
 * - speed = 90 / sec90Feet (ft/sec, distance/time)
 * - areaCoverageRate = speed × width (ft²/sec, area coverage rate)
 * - effectiveAreaRate = areaCoverageRate / overlap (effective area accounting for overlap)
 * - volumePerSqFt = volumePerSec / effectiveAreaRate (volume/ft²)
 * - Result = volumePerSqFt × 1000 (volume/1000 ft²)
 */
export function calculateCarrierRate({
  sec90Feet,
  doubleOverlap,
  width,
  flowRate,
  flowRateUnit,
}: {
  sec90Feet: number;
  doubleOverlap: boolean;
  width: number;
  flowRate: number;
  flowRateUnit: VolumeUnit;
}): number {
  if (flowRateUnit.metric !== "volume") {
    throw new Error(
      `flowRateUnit must be a volume unit, got metric: ${flowRateUnit.metric}`
    );
  }

  const volumePerSec = flowRate / 60;
  const speed = 90 / sec90Feet;
  const areaCoverageRate = speed * width;
  const overlap = doubleOverlap ? 2 : 1;
  const effectiveAreaRate = areaCoverageRate / overlap;
  const volumePerSqFt = volumePerSec / effectiveAreaRate;

  return volumePerSqFt * 1000;
}
