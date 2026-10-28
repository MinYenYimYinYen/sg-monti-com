import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";
import { getStubTotals } from "@/app/prepayLetters/pricing/stubTotals";
import { getUpsellLetterPricing } from "@/app/prepayLetters/pricing/upsellPricing";

// Kept free of JSX / react-pdf / image imports so it can be unit tested directly.

export type IntentionLine = {
  key: "addUpsell" | "prepayCurrent" | "payAutomatically";
  text: string;
  /** False for a statement the customer does not need to mark. */
  hasCheckbox: boolean;
};

type BuildIntentionLinesParams = {
  customer: Customer;
  config: PrepayConfig;
  upsell: ProgCode | null;
};

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * The lines where the customer marks their intention with a pen.
 *
 * - Upsell line: only when the upsell can be priced. Saves the combined prepay discount.
 * - Current line: always present. Saves the current services' prepay discount.
 * - Automatic payments: a checkbox line, unless any program is already billed to the
 *   card on file — then it is a statement with no checkbox.
 */
export function buildIntentionLines({
  customer,
  config,
  upsell,
}: BuildIntentionLinesParams): IntentionLine[] {
  const lines: IntentionLine[] = [];

  const upsellPricing = getUpsellLetterPricing({
    customer,
    upsell,
    prepayPercent: config.upsellPrepayDiscPercent,
  });
  const currentTotals = getStubTotals({
    customer,
    config,
    upsell,
    totalsSource: "current",
  });

  if (upsellPricing !== null) {
    lines.push({
      key: "addUpsell",
      text: `I'd like to add the recommended services and save ${formatMoney(upsellPricing.combinedTotals.prepayDisc)}!`,
      hasCheckbox: true,
    });
  }

  lines.push({
    key: "prepayCurrent",
    text: `I'd like to prepay my current services and save ${formatMoney(currentTotals.prepayDisc)}.`,
    hasCheckbox: true,
  });

  const isAlreadyAutopay = customer.programs.some(
    (program) => program.x.isAutopay,
  );
  lines.push(
    isAlreadyAutopay
      ? {
          key: "payAutomatically",
          text: "You are currently set up to pay automatically after services are performed.",
          hasCheckbox: false,
        }
      : {
          key: "payAutomatically",
          text: "I'd like to pay automatically after each service (credit card on back).",
          hasCheckbox: true,
        },
  );

  return lines;
}
