import { describe, it, expect } from "vitest";
import { getServCodeDisplayName } from "@/app/prepayLetters/pricing/servCodeDisplayName";

describe("getServCodeDisplayName", () => {
  it("prefers the long name", () => {
    expect(getServCodeDisplayName({ longName: "Mosquito Reduction - End of May", name: "Mosq May" })).toBe(
      "Mosquito Reduction - End of May",
    );
  });

  it("falls back to the short name when the long name is empty", () => {
    expect(getServCodeDisplayName({ longName: "", name: "Mosq May" })).toBe("Mosq May");
  });

  it("falls back to the short name when the long name is only whitespace", () => {
    expect(getServCodeDisplayName({ longName: "   ", name: "Mosq May" })).toBe("Mosq May");
  });
});
