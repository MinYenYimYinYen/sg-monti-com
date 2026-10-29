import { describe, it, expect } from "vitest";
import { samplePrepayConfig } from "@/app/realGreen/sampleData/samplePrepayConfig";
import { buildLetterMessage } from "@/app/prepayLetters/template/letterMessage";

describe("buildLetterMessage", () => {
  it("prints the auto renew message before the universal message", () => {
    expect(buildLetterMessage({ config: samplePrepayConfig, isAutoRenew: true })).toBe(
      `${samplePrepayConfig.autoRenewMessage} ${samplePrepayConfig.universalMessage}`,
    );
  });

  it("prints only the don't auto renew message for a don't auto renew letter", () => {
    expect(buildLetterMessage({ config: samplePrepayConfig, isAutoRenew: false })).toBe(
      samplePrepayConfig.dontAutoRenewMessage,
    );
  });
});
