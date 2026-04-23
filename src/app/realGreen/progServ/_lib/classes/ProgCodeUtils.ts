import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import {
  getPriceChartPrice,
  isEcon,
  calculatePrepayDiscAmt,
  calculateTaxAmt,
  calculateServTotal,
} from "@/app/realGreen/priceTable/_lib/pricingFuncs";

type ProgCodeFactory = (
  progCodeData: Omit<ProgCode, "servCodes" | "x">,
  servCodeDatas: Omit<ServCode, "progCode" | "x">[],
) => ProgCode;

export class ProgCodeUtils {
  constructor(
    private readonly progCode: Omit<ProgCode, "x">,
    private readonly factory: ProgCodeFactory,
  ) {}

  /** Returns a new ProgCodeUtils scoped to only the specified ServCodes. */
  getByServCodeIds(servCodeIds: string[]): ProgCodeUtils {
    const filtered = this.progCode.servCodes.filter((s) =>
      servCodeIds.includes(s.servCodeId),
    );
    const scoped = this.factory(
      { ...this.progCode },
      filtered.map((s) => ({ ...s })),
    );
    return scoped.x;
  }

  /** Price per visit from the preferred price table for a given size. */
  getPrefPrice(size: number): number | null {
    if (this.progCode.priceTable === null) return null;
    return getPriceChartPrice({ size, priceTable: this.progCode.priceTable });
  }

  /** Price per visit from the economy price table for a given size. */
  getEconPrice(size: number): number | null {
    if (this.progCode.econPriceTable === null) return null;
    return getPriceChartPrice({
      size,
      priceTable: this.progCode.econPriceTable,
    });
  }

  /**
   * Auto-selects preferred or economy price based on isEcon logic.
   * Uses servCodes.length on this instance as the active service count.
   */
  getServPrice(size: number): number | null {
    const useEcon = isEcon({
      minForPreferred: this.progCode.minForPreferred,
      activeServiceCount: this.progCode.servCodes.length,
    });
    if (useEcon) {
      return this.getEconPrice(size) ?? this.getPrefPrice(size);
    }
    return this.getPrefPrice(size);
  }

  /** Total program price: getServPrice(size) × servCodes.length */
  getSubTotal(size: number): number | null {
    const price = this.getServPrice(size);
    if (price === null) return null;
    return price * this.progCode.servCodes.length;
  }

  /**
   * Total prepay discount amount across all services.
   * Rounds per-service then multiplies — matches SA5 behavior.
   */
  getPrepayDiscAmt(size: number, prepayPercent: number): number | null {
    const servPrice = this.getServPrice(size);
    if (servPrice === null) return null;
    const perServ = calculatePrepayDiscAmt({ servPrice, prepayPercent });
    return perServ * this.progCode.servCodes.length;
  }

  /**
   * Total tax amount across all services, applied to the post-prepay price.
   * Rounds per-service then multiplies — matches SA5 behavior.
   */
  getTaxAmt(size: number, prepayPercent: number, taxRate: number): number | null {
    const servPrice = this.getServPrice(size);
    if (servPrice === null) return null;
    const prepayDiscAmtPerServ = calculatePrepayDiscAmt({ servPrice, prepayPercent });
    const taxAmtPerServ = calculateTaxAmt({ servPrice, prepayDiscAmt: prepayDiscAmtPerServ, taxRate });
    return taxAmtPerServ * this.progCode.servCodes.length;
  }

  /**
   * Total net amount due across all services: (subTotal - prepayDiscAmt) + taxAmt.
   * All intermediate values are rounded per-service before summing.
   */
  getTotal(size: number, prepayPercent: number, taxRate: number): number | null {
    const servPrice = this.getServPrice(size);
    if (servPrice === null) return null;
    const prepayDiscAmtPerServ = calculatePrepayDiscAmt({ servPrice, prepayPercent });
    const taxAmtPerServ = calculateTaxAmt({ servPrice, prepayDiscAmt: prepayDiscAmtPerServ, taxRate });
    const totalPerServ = calculateServTotal({ servPrice, prepayDiscAmt: prepayDiscAmtPerServ, taxAmt: taxAmtPerServ });
    return totalPerServ * this.progCode.servCodes.length;
  }
}
