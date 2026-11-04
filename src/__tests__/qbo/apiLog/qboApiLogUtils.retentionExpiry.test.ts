import { describe, expect, it } from "vitest";
import { classifyOutcome, retentionExpiry } from "@/app/qbo/apiLog/_lib/qboApiLogUtils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-04T12:00:00.000Z");

describe("retentionExpiry", () => {
  it("keeps a success for 90 days", () => {
    const expiry = retentionExpiry({ outcome: "success", now });
    expect(expiry.getTime() - now.getTime()).toBe(90 * MS_PER_DAY);
  });

  it("keeps an HTTP error for 365 days", () => {
    const expiry = retentionExpiry({ outcome: "httpError", now });
    expect(expiry.getTime() - now.getTime()).toBe(365 * MS_PER_DAY);
  });

  it("keeps a network error for 365 days, because its outcome at Intuit is unknown", () => {
    const expiry = retentionExpiry({ outcome: "networkError", now });
    expect(expiry.getTime() - now.getTime()).toBe(365 * MS_PER_DAY);
  });

  it("does not change the date it was given", () => {
    retentionExpiry({ outcome: "success", now });
    expect(now.toISOString()).toBe("2026-11-04T12:00:00.000Z");
  });
});

describe("classifyOutcome", () => {
  it("treats status 0 as a network error", () => {
    expect(classifyOutcome(0)).toBe("networkError");
  });

  it.each([200, 201, 204, 299])("treats %i as a success", (status) => {
    expect(classifyOutcome(status)).toBe("success");
  });

  it.each([300, 400, 401, 429, 500, 503])("treats %i as an HTTP error", (status) => {
    expect(classifyOutcome(status)).toBe("httpError");
  });
});
