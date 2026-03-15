// import {
//   AppUnit,
//   AreaUnit,
//   LengthUnit,
//   TimeUnit,
//   VolumeUnit,
// } from "@/app/realGreen/product/unitConfig/UnitTypes";
//
// /**
//  * Type-safe unit conversion system for application method calculations
//  */
// export class UnitConversions {
//   // Volume conversions (to gallons)
//   private static readonly VOLUME_TO_GALLONS: Record<VolumeUnit["desc"], number> = {
//     [AppUnit.mGal]: 1,
//     [AppUnit.flOz]: 1 / 128,
//   };
//
//   // Area conversions (to square feet)
//   private static readonly AREA_TO_SQ_FT: Record<AreaUnit["desc"], number> = {
//     [AppUnit.sf]: 1,
//     [AppUnit.ksf]: 1000,
//   };
//
//   // Length conversions (to feet)
//   private static readonly LENGTH_TO_FEET: Record<LengthUnit["desc"], number> = {
//     [AppUnit.ft]: 1,
//   };
//
//   // Time conversions (to seconds)
//   private static readonly TIME_TO_SECONDS: Record<TimeUnit["desc"], number> = {
//     [AppUnit.sec]: 1,
//   };
//
//   /**
//    * Convert volume from one unit to another
//    */
//   static convertVolume(
//     value: number,
//     fromUnit: VolumeUnit["desc"],
//     toUnit: VolumeUnit["desc"]
//   ): number {
//     const gallons = value * this.VOLUME_TO_GALLONS[fromUnit];
//     return gallons / this.VOLUME_TO_GALLONS[toUnit];
//   }
//
//   /**
//    * Convert volume to gallons
//    */
//   static volumeToGallons(value: number, unit: VolumeUnit["desc"]): number {
//     return value * this.VOLUME_TO_GALLONS[unit];
//   }
//
//   /**
//    * Convert gallons to specified volume unit
//    */
//   static gallonsToVolume(gallons: number, unit: VolumeUnit["desc"]): number {
//     return gallons / this.VOLUME_TO_GALLONS[unit];
//   }
//
//   /**
//    * Convert area from one unit to another
//    */
//   static convertArea(
//     value: number,
//     fromUnit: AreaUnit["desc"],
//     toUnit: AreaUnit["desc"]
//   ): number {
//     const sqFt = value * this.AREA_TO_SQ_FT[fromUnit];
//     return sqFt / this.AREA_TO_SQ_FT[toUnit];
//   }
//
//   /**
//    * Convert area to square feet
//    */
//   static areaToSqFt(value: number, unit: AreaUnit["desc"]): number {
//     return value * this.AREA_TO_SQ_FT[unit];
//   }
//
//   /**
//    * Convert square feet to specified area unit
//    */
//   static sqFtToArea(sqFt: number, unit: AreaUnit["desc"]): number {
//     return sqFt / this.AREA_TO_SQ_FT[unit];
//   }
//
//   /**
//    * Convert length from one unit to another
//    */
//   static convertLength(
//     value: number,
//     fromUnit: LengthUnit["desc"],
//     toUnit: LengthUnit["desc"]
//   ): number {
//     const feet = value * this.LENGTH_TO_FEET[fromUnit];
//     return feet / this.LENGTH_TO_FEET[toUnit];
//   }
//
//   /**
//    * Convert time from one unit to another
//    */
//   static convertTime(
//     value: number,
//     fromUnit: TimeUnit["desc"],
//     toUnit: TimeUnit["desc"]
//   ): number {
//     const seconds = value * this.TIME_TO_SECONDS[fromUnit];
//     return seconds / this.TIME_TO_SECONDS[toUnit];
//   }
//
//   /**
//    * Convert volume per area (application rate) between units
//    *
//    * @example
//    * // Convert 2 Gal/1000sf to Fl Oz/1000sf
//    * convertVolumePerArea(2, "Mixed Gal", "1000 SF", "Fl Oz", "1000 SF")
//    * // Returns: 256
//    */
//   static convertVolumePerArea(
//     value: number,
//     fromVolumeUnit: VolumeUnit["desc"],
//     fromAreaUnit: AreaUnit["desc"],
//     toVolumeUnit: VolumeUnit["desc"],
//     toAreaUnit: AreaUnit["desc"]
//   ): number {
//     // Convert to base units (gallons per square foot)
//     const gallons = this.volumeToGallons(value, fromVolumeUnit);
//     const sqFt = this.areaToSqFt(1, fromAreaUnit);
//     const gallonsPerSqFt = gallons / sqFt;
//
//     // Convert to target units
//     const targetSqFt = this.areaToSqFt(1, toAreaUnit);
//     const targetGallons = gallonsPerSqFt * targetSqFt;
//     return this.gallonsToVolume(targetGallons, toVolumeUnit);
//   }
// }
