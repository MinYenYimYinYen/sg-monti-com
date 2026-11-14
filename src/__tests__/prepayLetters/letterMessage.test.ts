import { describe, it, expect } from "vitest";
import { makePrepayConfig } from "@/_builders/makePrepayConfig";
import { buildLetterMessage } from "@/app/prepayLetters/template/letterMessage";

const config = makePrepayConfig({
  autoRenewMessage: "Auto renew message.",
  dontAutoRenewMessage: "Don't auto renew message.",
  universalMessage: "Universal message.",
});

describe("buildLetterMessage", () => {
  it("prints the auto renew message before the universal message", () => {
    expect(buildLetterMessage({ config, isAutoRenew: true })).toBe(
      "Auto renew message. Universal message.",
    );
  });

  it("prints only the don't auto renew message for a don't auto renew letter", () => {
    expect(buildLetterMessage({ config, isAutoRenew: false })).toBe(
      "Don't auto renew message.",
    );
  });
});
