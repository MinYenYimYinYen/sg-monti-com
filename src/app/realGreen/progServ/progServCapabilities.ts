import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Program codes and service codes: the RealGreen lists of what programs a customer can be on and
// which services each program runs, with the settings this app keeps beside them (which price
// tables a program uses, how a service's product rules and call-ahead tag are set).
//
// progCodes.realGreen.read   -> progServ getProgCodes (RealGreen list, stored doc props, and the
//                               program-to-service links, which are cached in Mongo as a side
//                               effect of the read)
// servCodes.realGreen.read   -> progServ getServCodes (RealGreen list merged with stored doc props)
// progCodeDocProps.write     -> progServ saveProgCodeChanges
// servCodeDocProps.write     -> progServ saveServCodeChanges
//
// The two lists live in RealGreen and are read only here (`source: "realGreen"`): this app never
// changes RealGreen's codes. The doc props are this app's own data, but they are only ever loaded
// merged into the lists, so they have no read of their own and each write lists the list read it
// needs (the same shape as `callAheadDocProps`). Both saves are upserts of settings and can be
// undone by saving the old values, so neither is irreversible.
//
// The pieces are separate resources because they change different data: a program code's price
// tables affect every price shown for that program, while a service code's rules and call-ahead tag
// only affect scheduling and call-aheads.
export const progServCapabilities = createFeatureCapabilities({
  key: "progServ",
  resources: {
    progCodes: { shape: "collection", source: "realGreen", verbs: ["read"] },
    servCodes: { shape: "collection", source: "realGreen", verbs: ["read"] },
    progCodeDocProps: { shape: "collection", verbs: ["write"] },
    servCodeDocProps: { shape: "collection", verbs: ["write"] },
  },
});
