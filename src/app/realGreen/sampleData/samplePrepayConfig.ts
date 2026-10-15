import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";

export const samplePrepayConfig: PrepayConfig = {
  configId: "sample-config",
  name: "Sample Config",
  saId: "sample-sa",
  selectionMode: "single",
  showCreditBalance: false,
  showRemitBalance: false,
  season: 2026,
  stdPrepayDiscPercent: 5,
  upsellPrepayDiscPercent: 10,
  expirationDate: "2026-01-31",
  autoRenewHeader: "This is an AutoRenew Header",
  dontAutoRenewHeader: "This is a DontAutoRenew Header",
  autoRenewMessage: "This is an auto renew message.",
  dontAutoRenewMessage: "This is a don't auto renew message.",
  universalMessage: "This is a universal message.",
  currentServicesHeader: "This is a Current Services Header",
  upsellServicesHeader: "This is an Upsell Services Header",
};
