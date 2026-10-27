import { describe, expect, it } from "vitest";
import {
  describeSeasonPair,
  isValidSeasonPair,
  normalizeSeasonPair,
} from "@/app/priceIncrease/_lib/priceIncreaseFuncs";

describe("isValidSeasonPair", () => {
  it("accepts target equal to source", () => {
    expect(isValidSeasonPair({ seasonSource: 2026, targetSeason: 2026 })).toBe(true);
  });

  it("accepts target one season beyond source", () => {
    expect(isValidSeasonPair({ seasonSource: 2026, targetSeason: 2027 })).toBe(true);
  });

  it("rejects target before source", () => {
    expect(isValidSeasonPair({ seasonSource: 2026, targetSeason: 2025 })).toBe(false);
  });

  it("rejects target more than one season beyond source", () => {
    expect(isValidSeasonPair({ seasonSource: 2026, targetSeason: 2028 })).toBe(false);
  });
});

describe("normalizeSeasonPair", () => {
  it("leaves a valid pair unchanged", () => {
    expect(normalizeSeasonPair({ seasonSource: 2026, targetSeason: 2027 })).toEqual({
      seasonSource: 2026,
      targetSeason: 2027,
    });
  });

  it("raises a target that fell behind the source", () => {
    expect(normalizeSeasonPair({ seasonSource: 2027, targetSeason: 2026 })).toEqual({
      seasonSource: 2027,
      targetSeason: 2027,
    });
  });

  it("lowers a target that is too far ahead of the source", () => {
    expect(normalizeSeasonPair({ seasonSource: 2025, targetSeason: 2028 })).toEqual({
      seasonSource: 2025,
      targetSeason: 2026,
    });
  });
});

describe("describeSeasonPair", () => {
  it("describes the same-season case", () => {
    expect(describeSeasonPair({ seasonSource: 2027, targetSeason: 2027 })).toBe(
      "Considering 2027 program pricing to determine new pricing for 2027 programs.",
    );
  });

  it("describes the one-season-ahead case", () => {
    expect(describeSeasonPair({ seasonSource: 2026, targetSeason: 2027 })).toBe(
      "Considering 2026 program pricing to determine new pricing for 2027 programs.",
    );
  });
});
