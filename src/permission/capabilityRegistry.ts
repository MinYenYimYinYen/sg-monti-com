import { buildRegistry } from "@/permission/buildRegistry";

import { allCombinedCapabilities } from "@/permission/combinedCapabilities";

// The one place that lists every feature's capabilities, the way combineReducers lists slices.
// To register a feature, import the result of its createFeatureCapabilities (kept beside the
// feature in <feature>Capabilities.ts) and add it here. The drift test fails if a declaration
// file exists that is not listed.
//
// Only the admin UI, the capability loaders and tests import this file. A handler or component
// imports just its own feature's `can` constants.
//
// Starts with the permission module's own feature. Other features are added as they declare
// capabilities (nothing blocks on that: every module that takes a registry is tested against
// test-local ones).

export const capabilityRegistry = buildRegistry(allCombinedCapabilities);
