import { describe, expect, it } from "vitest";
import {
  buildConfirmedKeySet,
  confirmedUpdateMode,
  confirmationKey,
  findUnconfirmedRowIds,
  isDescriptionConfirmed,
  validateConfirmation,
} from "@/app/qbo/importCCTxn/_lib/importConfirmUtils";
import { makeMapping, makeRow } from "@/__tests__/qbo/importCCTxn/importTestHelpers";

const depotMapping = makeMapping({
  merchantKey: "HARDWARE DEPOT",
  confirmedMerchants: ["HARDWARE DEPOT #109"],
});

describe("buildConfirmedKeySet and isDescriptionConfirmed", () => {
  const confirmedKeys = buildConfirmedKeySet([depotMapping]);

  it("finds a description that was confirmed", () => {
    expect(
      isDescriptionConfirmed({
        confirmedKeys,
        merchantKey: "HARDWARE DEPOT",
        description: "HARDWARE DEPOT #109",
      }),
    ).toBe(true);
  });

  it("does not find another description of the same family", () => {
    expect(
      isDescriptionConfirmed({
        confirmedKeys,
        merchantKey: "HARDWARE DEPOT",
        description: "HARDWARE DEPOT #458",
      }),
    ).toBe(false);
  });

  it("ignores case and spacing in the description", () => {
    expect(
      isDescriptionConfirmed({
        confirmedKeys,
        merchantKey: "HARDWARE DEPOT",
        description: "  hardware   depot #109 ",
      }),
    ).toBe(true);
  });

  it("does not let a description confirmed for one merchant count for another", () => {
    expect(
      isDescriptionConfirmed({
        confirmedKeys,
        merchantKey: "OTHER FAMILY",
        description: "HARDWARE DEPOT #109",
      }),
    ).toBe(false);
  });

  it("copes with a stored mapping that has no confirmed list yet", () => {
    const old = { merchantKey: "OLD", confirmedMerchants: undefined } as unknown as Parameters<
      typeof buildConfirmedKeySet
    >[0][number];
    expect(buildConfirmedKeySet([old]).size).toBe(0);
  });

  it("starts empty for no mappings", () => {
    expect(buildConfirmedKeySet([]).size).toBe(0);
  });
});

describe("findUnconfirmedRowIds", () => {
  const confirmedKeys = buildConfirmedKeySet([depotMapping]);
  const mappingMap = new Map([["HARDWARE DEPOT", depotMapping]]);

  it("lists a row with a mapping whose own description was not confirmed", () => {
    const rows = [
      makeRow({ rowId: "a:1", merchantKey: "HARDWARE DEPOT", description: "HARDWARE DEPOT #458" }),
    ];
    expect(findUnconfirmedRowIds({ rows, mappingMap, confirmedKeys })).toEqual(["a:1"]);
  });

  it("leaves out a row whose description was confirmed", () => {
    const rows = [
      makeRow({ rowId: "a:1", merchantKey: "HARDWARE DEPOT", description: "HARDWARE DEPOT #109" }),
    ];
    expect(findUnconfirmedRowIds({ rows, mappingMap, confirmedKeys })).toEqual([]);
  });

  it("leaves out a row with no mapping, which has nothing pre-filled to look at", () => {
    const rows = [makeRow({ rowId: "b:1", merchantKey: "UNMAPPED", description: "UNMAPPED" })];
    expect(findUnconfirmedRowIds({ rows, mappingMap, confirmedKeys })).toEqual([]);
  });
});

describe("confirmedUpdateMode", () => {
  it("adds to the list when the vendor is unchanged", () => {
    expect(confirmedUpdateMode({ existingVendorId: "77", vendorId: "77" })).toBe("add");
  });

  it("starts the list over when the vendor changes, because old confirmations were for the old vendor", () => {
    expect(confirmedUpdateMode({ existingVendorId: "77", vendorId: "88" })).toBe("replace");
  });

  it("starts the list for a mapping that does not exist yet", () => {
    expect(confirmedUpdateMode({ existingVendorId: null, vendorId: "77" })).toBe("replace");
  });
});

describe("validateConfirmation", () => {
  it("accepts a description that belongs to the family, returning it in collapsed form", () => {
    expect(
      validateConfirmation({ merchantKey: "HARDWARE DEPOT", description: " hardware  depot #109" }),
    ).toEqual({ confirmedDescription: "HARDWARE DEPOT #109", problem: null });
  });

  it("refuses a description that belongs to another family", () => {
    const { problem } = validateConfirmation({
      merchantKey: "HARDWARE DEPOT",
      description: "SQ *JOES PIZZA",
    });
    expect(problem).toBe("That description does not belong to this merchant.");
  });

  it("refuses a blank description", () => {
    expect(validateConfirmation({ merchantKey: "HARDWARE DEPOT", description: "   " }).problem).toBe(
      "Choose a description to confirm.",
    );
  });
});

describe("confirmationKey", () => {
  it("is the same for the same merchant and description however it is written", () => {
    expect(confirmationKey({ merchantKey: "A", description: "x  y" })).toBe(
      confirmationKey({ merchantKey: "A", description: "X Y" }),
    );
  });

  it("differs by merchant", () => {
    expect(confirmationKey({ merchantKey: "A", description: "X" })).not.toBe(
      confirmationKey({ merchantKey: "B", description: "X" }),
    );
  });
});
