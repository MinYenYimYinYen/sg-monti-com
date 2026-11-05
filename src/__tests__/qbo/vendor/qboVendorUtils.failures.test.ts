import { describe, expect, it } from "vitest";
import {
  classifyVendorCreateFailure,
  readFaultCodes,
} from "@/app/qbo/vendor/_lib/qboVendorUtils";

describe("readFaultCodes", () => {
  it("reads the codes from the errors qboHttp keeps on an AppError", () => {
    const data = { errors: [{ code: "6240", Message: "Duplicate" }, { code: "2020" }] };
    expect(readFaultCodes(data)).toEqual(["6240", "2020"]);
  });

  it("turns a numeric code into a string", () => {
    expect(readFaultCodes({ errors: [{ code: 6240 }] })).toEqual(["6240"]);
  });

  it.each([undefined, null, {}, { errors: "nope" }, { errors: [] }])(
    "returns no codes for %j",
    (data) => {
      expect(readFaultCodes(data)).toEqual([]);
    },
  );

  it("skips an error with no code", () => {
    expect(readFaultCodes({ errors: [{ Message: "x" }, null, { code: "610" }] })).toEqual(["610"]);
  });
});

describe("classifyVendorCreateFailure", () => {
  it("treats error 6240 as a duplicate name", () => {
    expect(
      classifyVendorCreateFailure({ type: "EXTERNAL_ERROR", statusCode: 400, faultCodes: ["6240"] }),
    ).toBe("duplicateName");
  });

  it("finds 6240 among several codes", () => {
    expect(
      classifyVendorCreateFailure({
        type: "EXTERNAL_ERROR",
        statusCode: 400,
        faultCodes: ["2020", "6240"],
      }),
    ).toBe("duplicateName");
  });

  it("treats a network error as uncertain, because the vendor may have been saved", () => {
    expect(
      classifyVendorCreateFailure({ type: "NETWORK_ERROR", statusCode: 0, faultCodes: [] }),
    ).toBe("uncertain");
  });

  it.each([500, 502, 503])("treats a %i as uncertain", (statusCode) => {
    expect(
      classifyVendorCreateFailure({ type: "EXTERNAL_ERROR", statusCode, faultCodes: [] }),
    ).toBe("uncertain");
  });

  it.each([400, 401, 403, 429])("treats a %i as rejected, so nothing was created", (statusCode) => {
    expect(
      classifyVendorCreateFailure({ type: "EXTERNAL_ERROR", statusCode, faultCodes: ["2020"] }),
    ).toBe("rejected");
  });

  it("lets a duplicate-name code win over a server status", () => {
    expect(
      classifyVendorCreateFailure({ type: "EXTERNAL_ERROR", statusCode: 500, faultCodes: ["6240"] }),
    ).toBe("duplicateName");
  });
});
