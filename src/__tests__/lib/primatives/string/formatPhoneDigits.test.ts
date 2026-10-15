import { describe, it, expect } from "vitest";
import { formatPhoneDigits } from "@/lib/primatives/string/formatPhoneDigits";

describe("formatPhoneDigits", () => {
  it("formats a 10-digit string into (XXX) XXX-XXXX", () => {
    expect(formatPhoneDigits("8005551234")).toBe("(800) 555-1234");
  });

  it("returns the input unchanged when fewer than 10 digits", () => {
    expect(formatPhoneDigits("123456789")).toBe("123456789");
  });

  it("returns the input unchanged when more than 10 digits", () => {
    expect(formatPhoneDigits("12345678901")).toBe("12345678901");
  });

  it("returns the input unchanged when it contains non-digit characters", () => {
    expect(formatPhoneDigits("800-555-1234")).toBe("800-555-1234");
  });

  it("returns an empty string unchanged", () => {
    expect(formatPhoneDigits("")).toBe("");
  });
});
