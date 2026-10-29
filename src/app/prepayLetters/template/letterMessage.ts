import type { PrepayConfig } from "@/app/prepayLetters/config/prepayConfigTypes";

// Kept free of JSX / react-pdf / image imports so it can be unit tested directly.

type BuildLetterMessageParams = {
  config: Pick<PrepayConfig, "universalMessage" | "autoRenewMessage" | "dontAutoRenewMessage">;
  isAutoRenew: boolean;
};

/**
 * The body message under the header. For auto renew, the renewal message comes first and the
 * universal message follows it. The don't-auto-renew letter prints only its own message.
 */
export function buildLetterMessage({ config, isAutoRenew }: BuildLetterMessageParams): string {
  if (!isAutoRenew) return config.dontAutoRenewMessage;
  return `${config.autoRenewMessage} ${config.universalMessage}`;
}
