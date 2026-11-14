import { describe, it, expect } from "vitest";
import { resolveEffective } from "@/permission/logic/resolveEffective";
import type { BundleGrants } from "@/permission/logic/permissionLogicTypes";
import type { Capability } from "@/permission/PermissionTypes";

/** The registry stand-in: `has` is all `resolveEffective` asks of it. */
function makeKnown(...known: Capability[]) {
  const knownSet = new Set<string>(known);
  return { has: (capability: string) => knownSet.has(capability) };
}

const registry = makeKnown(
  "customers.read",
  "customers.write",
  "callLogs.read",
  "callLogs.write",
  "holidays.read",
);

const officeBundle: BundleGrants = {
  bundleKey: "office",
  capabilities: ["customers.read", "callLogs.read"],
};
const fieldBundle: BundleGrants = {
  bundleKey: "field",
  capabilities: ["holidays.read", "customers.read"],
};

describe("resolveEffective", () => {
  it("is empty for a user with no bundles and no direct grants", () => {
    expect(
      resolveEffective({ bundleKeys: [], directCapabilities: [], bundles: [officeBundle], registry }),
    ).toEqual([]);
  });

  it("returns a bundle's capabilities", () => {
    expect(
      resolveEffective({
        bundleKeys: ["office"],
        directCapabilities: [],
        bundles: [officeBundle, fieldBundle],
        registry,
      }),
    ).toEqual(["customers.read", "callLogs.read"]);
  });

  it("returns direct grants alone", () => {
    expect(
      resolveEffective({
        bundleKeys: [],
        directCapabilities: ["callLogs.write"],
        bundles: [officeBundle],
        registry,
      }),
    ).toEqual(["callLogs.write"]);
  });

  it("is the union of several bundles and the direct grants", () => {
    const effective = resolveEffective({
      bundleKeys: ["office", "field"],
      directCapabilities: ["callLogs.write"],
      bundles: [officeBundle, fieldBundle],
      registry,
    });

    expect([...effective].sort()).toEqual(
      ["callLogs.read", "callLogs.write", "customers.read", "holidays.read"].sort(),
    );
  });

  it("lists a capability once when bundles and direct grants overlap", () => {
    const effective = resolveEffective({
      bundleKeys: ["office", "field"],
      directCapabilities: ["customers.read"],
      bundles: [officeBundle, fieldBundle],
      registry,
    });

    expect(effective.filter((capability) => capability === "customers.read")).toHaveLength(1);
    expect(effective).toHaveLength(3);
  });

  it("puts bundle capabilities before direct grants, in the order given", () => {
    const effective = resolveEffective({
      bundleKeys: ["field", "office"],
      directCapabilities: ["callLogs.write", "customers.read"],
      bundles: [officeBundle, fieldBundle],
      registry,
    });

    expect(effective).toEqual([
      "holidays.read",
      "customers.read",
      "callLogs.read",
      "callLogs.write",
    ]);
  });

  it("infers nothing: write does not bring read", () => {
    const effective = resolveEffective({
      bundleKeys: [],
      directCapabilities: ["customers.write"],
      bundles: [],
      registry,
    });

    expect(effective).toEqual(["customers.write"]);
    expect(effective).not.toContain("customers.read");
  });

  it("drops a capability in a bundle that the registry no longer knows", () => {
    const staleBundle: BundleGrants = {
      bundleKey: "stale",
      capabilities: ["customers.read", "liveCustomers.read", "pace.assignments.read"],
    };

    expect(
      resolveEffective({
        bundleKeys: ["stale"],
        directCapabilities: [],
        bundles: [staleBundle],
        registry,
      }),
    ).toEqual(["customers.read"]);
  });

  it("drops a direct grant that the registry no longer knows", () => {
    expect(
      resolveEffective({
        bundleKeys: [],
        directCapabilities: ["liveCustomers.read", "holidays.read"],
        bundles: [],
        registry,
      }),
    ).toEqual(["holidays.read"]);
  });

  it("ignores a bundle key that has no matching bundle", () => {
    expect(
      resolveEffective({
        bundleKeys: ["deleted", "office"],
        directCapabilities: [],
        bundles: [officeBundle],
        registry,
      }),
    ).toEqual(["customers.read", "callLogs.read"]);
  });

  it("does not let a bundle the user lacks leak in", () => {
    expect(
      resolveEffective({
        bundleKeys: ["office"],
        directCapabilities: [],
        bundles: [officeBundle, fieldBundle],
        registry,
      }),
    ).not.toContain("holidays.read");
  });

  it("returns a fresh list and leaves its inputs unchanged", () => {
    const bundleKeys = ["office"];
    const directCapabilities: Capability[] = ["callLogs.write"];

    const effective = resolveEffective({
      bundleKeys,
      directCapabilities,
      bundles: [officeBundle],
      registry,
    });
    effective.push("holidays.read");

    expect(officeBundle.capabilities).toEqual(["customers.read", "callLogs.read"]);
    expect(directCapabilities).toEqual(["callLogs.write"]);
    expect(bundleKeys).toEqual(["office"]);
  });
});
