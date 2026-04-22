import { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import {
  getPriceChartPrice,
  isEcon,
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
  getPrice(size: number): number | null {
    const useEcon = isEcon({
      minForPreferred: this.progCode.minForPreferred,
      activeServiceCount: this.progCode.servCodes.length,
    });
    if (useEcon) {
      return this.getEconPrice(size) ?? this.getPrefPrice(size);
    }
    return this.getPrefPrice(size);
  }

  /** Total program price: getPrice(size) × servCodes.length */
  getTotalPrice(size: number): number | null {
    const price = this.getPrice(size);
    if (price === null) return null;
    return price * this.progCode.servCodes.length;
  }
}
