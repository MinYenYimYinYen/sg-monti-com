import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";

// Kept free of JSX / react-pdf / image imports so it can be unit tested directly.
//
// The customer's net balance is account-level, not per program. A negative balance
// is a credit (reduces what is due); a positive balance is a remit balance (adds to
// what is due). Each shows only when its config flag is on. Zero never shows.

export type BalanceAdjustment = {
  /** Positive amount to deduct, or 0 when it does not apply. */
  creditBalance: number;
  /** Positive amount to add, or 0 when it does not apply. */
  remitBalance: number;
};

type GetBalanceAdjustmentParams = {
  customer: Customer;
  config: PrepayConfig;
};

export function getBalanceAdjustment({
  customer,
  config,
}: GetBalanceAdjustmentParams): BalanceAdjustment {
  const { netBalance } = customer;
  return {
    creditBalance:
      config.showCreditBalance && netBalance < 0 ? Math.abs(netBalance) : 0,
    remitBalance: config.showRemitBalance && netBalance > 0 ? netBalance : 0,
  };
}

type GetTotalDueParams = {
  /** The totals' `total` (after prepay discount and tax). */
  total: number;
  balances: BalanceAdjustment;
};

export function getTotalDue({ total, balances }: GetTotalDueParams): number {
  return total - balances.creditBalance + balances.remitBalance;
}
