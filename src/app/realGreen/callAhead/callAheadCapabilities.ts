import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Call-ahead: the RealGreen call-ahead list, the native settings kept beside it (which keywords and
// contact types each call-ahead uses) and the keyword messages those settings point at.
//
// callAheads.realGreen.read   -> callAhead getAll (RealGreen list merged with the stored doc props)
// callAheadDocProps.write     -> callAhead upsertDocProps
// keywords.read               -> callAhead getKeywords
// keywords.write              -> callAhead upsertKeyword
// keywords.delete             -> callAhead deleteKeyword
//
// The call-ahead list lives in RealGreen and is read only here (`source: "realGreen"`). The doc
// props are this app's own data, but they are only ever loaded merged into `getAll`, so they have no
// read of their own and `callAheadDocProps.write` lists the list read it needs. Deleting a keyword
// removes a message that call-aheads may still point at (they then show no message), which is why
// `delete` is its own verb.
export const callAheadCapabilities = createFeatureCapabilities({
  key: "callAhead",
  resources: {
    callAheads: { shape: "collection", source: "realGreen", verbs: ["read"] },
    callAheadDocProps: { shape: "collection", verbs: ["write"] },
    keywords: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
