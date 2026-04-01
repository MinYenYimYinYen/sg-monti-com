import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";

/**
 * A constituent of the mixture (carrier or solute).
 * ratePerKsf is the label rate (single-pass, no overlap) — the amount of this product
 * applied per ksf in a single pass. For the water carrier, ratePerKsf is 0 (derived
 * from AppMethod coverage minus solute rates).
 */
export type MixtureConstituent = {
  product: ProductSub;
  ratePerKsf: number;
};

/**
 * LoadoutConstituent — extends MixtureConstituent with loadout-tracking fields.
 *
 * Used in LoadoutBase equipment entries. The water carrier is always the first
 * constituent (identifiable by product.productId === WATER_PRODUCT_ID).
 * Solutes follow in subsequent entries.
 *
 * For the carrier: plannedAmount = water-only volume in the carrier's app unit
 * (Fl Oz or Gal). Computed as total mix volume − sum of volumetric solute volumes.
 *
 * For solutes: plannedAmount = that solute's own volume for the job
 * (label rate × overlap × job size), in the solute's app unit.
 */
export type LoadoutConstituent = MixtureConstituent & {
  plannedAmount: number;
  startAmount: number | null;
  finishAmount: number | null;
  unitId: number;
  unit: UnitCRM;
};

/**
 * ScaledConstituent — the result of scaling a constituent by a mix ratio.
 * amount is in the constituent's own app unit (as stored in plannedAmount).
 */
export type ScaledConstituent = {
  constituent: LoadoutConstituent;
  /** Scaled amount in the constituent's own app unit. */
  amount: number;
};

/**
 * Mixture — encapsulates the composition of a tank mix and provides scaling
 * for the MixWizard.
 *
 * The carrier constituent's plannedAmount is the water-only volume for the full job,
 * pre-computed in hydratePlannedLoadout as: total mix volume − sum of volumetric solute volumes.
 * Solute plannedAmounts are each solute's own volume for the full job.
 *
 * scaleMixture(ratio) scales every constituent by the given ratio, where ratio =
 * gallonsToMix / totalPlannedGallons. This gives the correct per-constituent amounts
 * for any partial or full tank fill.
 */
export class Mixture {
  private readonly carrier: LoadoutConstituent;
  private readonly solutes: LoadoutConstituent[];

  constructor(private readonly constituents: LoadoutConstituent[]) {
    this.carrier = constituents[0];
    this.solutes = constituents.slice(1);
  }

  /**
   * Water-only volume for the full job, in the carrier's app unit.
   * Pre-computed in hydratePlannedLoadout as total mix − volumetric solute volumes.
   */
  get waterOnlyAmount(): number {
    return this.carrier.plannedAmount;
  }

  /**
   * Scale all constituents by the given ratio.
   *
   * ratio = gallonsToMix / totalPlannedGallons
   *
   * Returns an array of ScaledConstituent where:
   * - [0] is the carrier (water), with amount = waterOnlyAmount × ratio
   * - [1..n] are solutes, with amount = solute.plannedAmount × ratio
   *
   * All amounts are in each constituent's own app unit.
   */
  scaleMixture(ratio: number): ScaledConstituent[] {
    const carrierScaled: ScaledConstituent = {
      constituent: this.carrier,
      amount: this.waterOnlyAmount * ratio,
    };

    const solutesScaled: ScaledConstituent[] = this.solutes.map((solute) => ({
      constituent: solute,
      amount: solute.plannedAmount * ratio,
    }));

    return [carrierScaled, ...solutesScaled];
  }
}
