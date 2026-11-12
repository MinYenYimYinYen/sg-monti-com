import {
  CapabilityRequirement,
  Capability,
  hasCapability,
  createFeatureCapabilities,
} from "@/permission/PermissionTypes";
import { TokenPayload } from "@/app/auth/_types/authTypes";

// Test-local declarations so the tests survive the real feature files being created.
// They cover each shape: external collection, native collection, userOwned, and public verbs.

/** Mirrors the planned custFlag feature: an external (RealGreen) collection, no delete. */
export const custFlagCapabilities = createFeatureCapabilities({
  key: "custFlag",
  resources: {
    custFlags: { shape: "collection", source: "realGreen", verbs: ["read", "write"] },
  },
});

/** Native collection plus a userOwned resource that has a readAny verb. */
export const widgetCapabilities = createFeatureCapabilities({
  key: "widgetManagement",
  resources: {
    widgets: { shape: "collection", verbs: ["read", "write", "delete"] },
    preferences: { shape: "userOwned", verbs: ["read", "write", "delete", "readAny"] },
  },
});

/** Same shape as widgets, with `read` public. */
export const publicWidgetCapabilities = createFeatureCapabilities({
  key: "widgetManagement",
  resources: {
    widgets: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
  public: { widgets: ["read"] },
});

export function makeTokenPayload(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    role: "office",
    userName: "tester",
    saId: "SA1",
    isSuperUser: false,
    mustChangePassword: false,
    ...overrides,
  };
}

/** Logged in, holds no capabilities. */
export const appliedUser = makeTokenPayload({ userName: "applied", saId: "SA-APPLIED" });

export const officeUser = makeTokenPayload({ userName: "office", saId: "SA-OFFICE" });
export const officeCapabilities: readonly Capability[] = [
  custFlagCapabilities.can.custFlags.read,
  widgetCapabilities.can.widgets.read,
  widgetCapabilities.can.preferences.read,
];

export const widgetEditor = makeTokenPayload({ userName: "editor", saId: "SA-EDITOR" });
export const widgetEditorCapabilities: readonly Capability[] = [
  widgetCapabilities.can.widgets.read,
  widgetCapabilities.can.widgets.write,
  widgetCapabilities.can.widgets.delete,
];

/** Token carries the superuser hint. The server must still confirm it against the document. */
export const superUserTokenHint = makeTokenPayload({
  userName: "superLuke",
  saId: "SA-BOGUS",
  isSuperUser: true,
});

/** Wraps hasCapability with the defaults most cases share: not a confirmed superuser, no capabilities. */
export function check({
  required,
  identity = appliedUser,
  isSuperUserConfirmed = false,
  capabilities = [],
}: {
  required: CapabilityRequirement;
  identity?: TokenPayload | null;
  isSuperUserConfirmed?: boolean;
  capabilities?: readonly Capability[];
}): boolean {
  return hasCapability({ required, identity, isSuperUserConfirmed, capabilities });
}
