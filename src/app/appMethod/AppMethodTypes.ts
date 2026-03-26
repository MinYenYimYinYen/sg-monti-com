import { AppMethodResult } from "./appMethodSolver/AppMethodSolver";

/**
 * AppMethod entity - reusable application method configuration
 *
 * Stores complete application parameters with full unit information.
 * Products reference AppMethods by appMethodId.
 *
 * @example
 * {
 *   appMethodId: "BACKPACK_STD",
 *   description: "Standard Backpack Application",
 *   flowRate: { volume: 3, volumeUnit: "Mixed Gal", time: 1, timeUnit: "Seconds" },
 *   groundSpeed: { distance: 90, distanceUnit: "Feet", time: 17.5, timeUnit: "Seconds" },
 *   patternWidth: { distance: 11, distanceUnit: "Feet" },
 *   coverage: { volume: 0.85, volumeUnit: "Mixed Gal", area: 1000, areaUnit: "1000 SF" },
 *   overlap: 2
 * }
 */
export type AppMethod = AppMethodResult & {
  appMethodId: string;   // Unique identifier
  description: string;   // User-friendly name
  needsWater: boolean;   // Auto-instantiate water carrier row in loadout
  tracksTankLevel: boolean; // True = filled once/day (tank); False = multi-fill (backpack)
};

/**
 * Document type for MongoDB storage
 * Same as AppMethod - all data is stored inline with complete unit information
 */
export type AppMethodDoc = AppMethod;
