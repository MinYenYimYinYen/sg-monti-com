import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

// Kept free of JSX / react-pdf / image imports so it can be unit tested directly.
//
// Installment programs are billed as a flat monthly amount in the CRM, but the
// service prices on them are shares of the plan total. Prepaying an installment
// plan makes no sense, so the prepay letter prices only non-installment programs
// and describes installment programs in words, without any numbers.

/** Programs that participate in prepay pricing (everything except installment). */
export function getPrepayPrograms(customer: Customer): Program[] {
  return customer.programs.filter((program) => !program.x.isInstallment);
}

/** Programs billed as monthly installments — described in the letter, never priced. */
export function getInstallmentPrograms(customer: Customer): Program[] {
  return customer.programs.filter((program) => program.x.isInstallment);
}

type CalculatePrepayTotalsParams = {
  programs: Program[];
  /** Prepay discount percentage (e.g. `5` for 5%). */
  prepayPercent: number;
};

export type PrepayTotals = {
  serviceAmt: number;
  prepayDisc: number;
  afterPrepay: number;
  tax: number;
  total: number;
};

/**
 * Sums prepay pricing across the given programs.
 * Pass the result of `getPrepayPrograms` so installment programs are excluded.
 */
export function calculatePrepayTotals({
  programs,
  prepayPercent,
}: CalculatePrepayTotalsParams): PrepayTotals {
  const sumOf = (getAmount: (program: Program) => number): number =>
    programs.reduce((sum, program) => sum + getAmount(program), 0);

  return {
    serviceAmt: sumOf((p) => p.x.getPriceAfterDiscounts("price")),
    prepayDisc: sumOf((p) => p.x.prepayDiscountAmt(prepayPercent)),
    afterPrepay: sumOf((p) => p.x.priceAfterPrepay(prepayPercent)),
    tax: sumOf((p) => p.x.taxAmt(prepayPercent)),
    total: sumOf((p) => p.x.priceAfterTax(prepayPercent)),
  };
}

type BuildInstallmentNoticeParams = {
  /** Result of `getInstallmentPrograms`. */
  programs: Program[];
};

/**
 * The customer-facing text for the `installmentPrograms` letter slot.
 * Names the installment programs. Deliberately contains no prices and no contact
 * details — contact wording belongs to the separate `contactUs` slot.
 * Returns null when there is nothing to say.
 */
export function buildInstallmentNotice({
  programs,
}: BuildInstallmentNoticeParams): string | null {
  if (programs.length === 0) return null;

  const isPlural = programs.length > 1;
  const intro = isPlural
    ? "The following programs are billed in monthly installments:"
    : "The following program is billed in monthly installments:";
  const programLines = programs.map(
    (program) => `\u2022 ${program.progCode.description}`,
  );

  return [intro, ...programLines].join("\n");
}
