import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";

// Neutral defaults (no messages, 0% discounts, balances hidden) so a test states only the
// settings it is about.
const defaultPrepayConfig: PrepayConfig = {
  configId: "config",
  name: "Config",
  saId: "sa",
  showCreditBalance: false,
  showRemitBalance: false,
  season: 2026,
  stdPrepayDiscPercent: 0,
  upsellPrepayDiscPercent: 0,
  expirationDate: "2026-01-31",
  autoRenewHeader: "",
  dontAutoRenewHeader: "",
  autoRenewMessage: "",
  dontAutoRenewMessage: "",
  universalMessage: "",
  currentServicesHeader: "",
  upsellServicesHeader: "",
};

export function makePrepayConfig(overrides: Partial<PrepayConfig> = {}): PrepayConfig {
  return { ...defaultPrepayConfig, ...overrides };
}
