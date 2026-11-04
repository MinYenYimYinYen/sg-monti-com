import { describe, expect, it } from "vitest";
import { redact, truncate } from "@/app/qbo/apiLog/_lib/qboApiLogUtils";

describe("redact", () => {
  it("hides a bearer token", () => {
    const result = redact("Request failed with Bearer abc123.def-456_ghi");
    expect(result).toBe("Request failed with Bearer [redacted]");
  });

  it("hides a basic authorization credential", () => {
    const result = redact("Sent Basic dXNlcjpwYXNzd29yZA== to Intuit");
    expect(result).not.toContain("dXNlcjpwYXNzd29yZA");
    expect(result).toContain("Basic [redacted]");
  });

  it("hides key=value credentials in a query string", () => {
    const result = redact("access_token=secretValue1&refresh_token=secretValue2&x=1");
    expect(result).not.toContain("secretValue1");
    expect(result).not.toContain("secretValue2");
    expect(result).toContain("access_token=[redacted]");
  });

  it("hides credentials inside JSON text", () => {
    const result = redact('{"refresh_token":"secretValue","client_secret":"anotherSecret"}');
    expect(result).not.toContain("secretValue");
    expect(result).not.toContain("anotherSecret");
  });

  it("hides the client id and secret", () => {
    const result = redact("client_id=ABCdef123 client_secret=shhhhh");
    expect(result).not.toContain("ABCdef123");
    expect(result).not.toContain("shhhhh");
  });

  it("hides the value of an authorization header", () => {
    const result = redact("Authorization: Bearer abc.def.ghi");
    expect(result).not.toContain("abc.def.ghi");
  });

  it("hides a JWT-shaped string", () => {
    const jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJl";
    expect(redact(`token was ${jwt} here`)).not.toContain(jwt);
  });

  it("hides a long opaque string that looks like a token", () => {
    const opaque = "A".repeat(20) + "b".repeat(20) + "9";
    expect(redact(`value ${opaque} end`)).toBe("value [redacted] end");
  });

  it("leaves an ordinary Intuit fault message alone", () => {
    const message = "Duplicate Name Exists Error: The name supplied already exists. (6240)";
    expect(redact(message)).toBe(message);
  });

  it("leaves an empty string empty", () => {
    expect(redact("")).toBe("");
  });
});

describe("truncate", () => {
  it("keeps text that fits", () => {
    expect(truncate({ text: "abc", maxLength: 3 })).toBe("abc");
  });

  it("cuts longer text and marks the cut", () => {
    expect(truncate({ text: "abcdef", maxLength: 3 })).toBe("abc…");
  });
});
