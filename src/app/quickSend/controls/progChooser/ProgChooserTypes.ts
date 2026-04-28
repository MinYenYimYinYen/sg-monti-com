import type { QSProgramVariables } from "@/app/quickSend/QuickSendTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

/**
 * Input to the progChooser pricing function for a single selected program.
 * All override fields are optional — absent values fall through to the next
 * level of the price cascade.
 */
export type ProgChooserPricingInput = {
  progCode: ProgCode;
  includedServCodeIds: string[];
  size: number;
  effectiveTaxRate: number | null;
  prepayPercent: number | null;
  /** Phase 3: program-level price override (per-visit). */
  progPriceOverride: number | null;
};

/**
 * Resolved pricing output for a single selected program in the progChooser loop.
 * Extends `QSProgramVariables` with the progCodeId so the resolver can map results.
 */
export type ProgChooserPricingResult = QSProgramVariables;
