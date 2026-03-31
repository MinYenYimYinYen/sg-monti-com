import { AppMethod } from "@/app/appMethod/AppMethodTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { UnitLabel, VolumeUnit } from "@/app/realGreen/product/unitConfig/UnitTypes";

/**
 * A solute is a non-carrier constituent of the mixture (e.g., Three-Way herbicide).
 * ratePerKsf is the label rate (single-pass, no overlap) — the amount of this product
 * applied per ksf in a single pass.
 */
export type MixtureConstituent = {
  product: ProductSub;
  ratePerKsf: number;
};

/**
 * Mixture — encapsulates the composition of a tank mix and provides reusable
 * computation methods for the MixWizard and any future workflow that needs to
 * reason about tank fills.
 *
 * The AppMethod's coverage rate (volume/area) represents the total mixed solution
 * dispensed by the nozzle — carrier (water) AND solutes combined. The overlap factor
 * is already baked into coverage.volume by the AppMethod solver.
 *
 * Each solute's ratePerKsf is the label rate (single-pass, no overlap). The solute's
 * actual contribution to the mix per ksf is ratePerKsf × overlap, because the tech
 * makes `overlap` passes over each unit area.
 *
 * Carrier (water) per ksf = totalRatePerKsf − sum(solute.ratePerKsf × overlap)
 */
export class Mixture {
  constructor(
    private readonly appMethod: AppMethod,
    private readonly solutes: MixtureConstituent[],
  ) {}

  /**
   * Total mix rate per ksf (Fl Oz/ksf), derived from AppMethod coverage.
   * Overlap is already baked in by the solver.
   */
  get totalRatePerKsf(): number {
    const { coverage } = this.appMethod;
    if (!coverage.area || !coverage.volume || !coverage.volumeUnit || !coverage.areaUnit) return 0;

    // Convert coverage rate to Fl Oz/ksf
    const rateInCoverageUnits = coverage.volume / coverage.area;
    const rateInFlOzPerCoverageArea = UnitUtils.volume(
      rateInCoverageUnits,
      coverage.volumeUnit as VolumeUnit["desc"],
    ).to(UnitLabel.flOz);

    // coverage.areaUnit is already ksf in practice, but convert explicitly for safety
    return UnitUtils.area(rateInFlOzPerCoverageArea, coverage.areaUnit).to(UnitLabel.ksf);
  }

  /**
   * Sum of all solute rates per ksf (Fl Oz/ksf), overlap-adjusted.
   * Each solute contributes ratePerKsf × overlap to the mix per ksf.
   */
  get soluteTotalRatePerKsf(): number {
    return this.solutes.reduce(
      (sum, s) => sum + s.ratePerKsf * this.appMethod.overlap,
      0,
    );
  }

  /**
   * Carrier (water) rate per ksf (Fl Oz/ksf).
   * = totalRatePerKsf − sum(solute.ratePerKsf × overlap)
   */
  get carrierRatePerKsf(): number {
    return this.totalRatePerKsf - this.soluteTotalRatePerKsf;
  }

  /**
   * Total mix volume (Fl Oz) needed to cover a given job size (ksf).
   */
  totalVolumeForKsf(ksf: number): number {
    return this.totalRatePerKsf * ksf;
  }

  /**
   * Carrier (water) volume (Fl Oz) for a given total mix volume.
   * Scales proportionally: carrier fraction = carrierRatePerKsf / totalRatePerKsf.
   */
  carrierForVolume(totalVolume: number): number {
    if (this.totalRatePerKsf === 0) return totalVolume;
    return (this.carrierRatePerKsf / this.totalRatePerKsf) * totalVolume;
  }

  /**
   * Volume of each solute (Fl Oz) for a given total mix volume.
   * Scales proportionally: solute fraction = (ratePerKsf × overlap) / totalRatePerKsf.
   */
  solutesForVolume(totalVolume: number): { product: ProductSub; volume: number }[] {
    if (this.totalRatePerKsf === 0) return [];
    return this.solutes.map((s) => ({
      product: s.product,
      volume: ((s.ratePerKsf * this.appMethod.overlap) / this.totalRatePerKsf) * totalVolume,
    }));
  }
}
