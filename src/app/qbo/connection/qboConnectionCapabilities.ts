import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// The app's single link to the company's QuickBooks books: the stored OAuth tokens and who made
// the connection. Tokens never appear in any result.
//
// connection.read  -> qbo/connection status, testConnection (a live read of CompanyInfo)
// connection.write -> qbo/connection startConnect. It only begins the OAuth round trip, but the
//                     callback then replaces the stored connection, so it changes which company
//                     every QuickBooks screen talks to. The callback checks this capability again
//                     for the user who started the round trip (it has no login cookie).
//
// connectionRevocation.write -> qbo/connection disconnect. Revokes the app's access at Intuit and
//   deletes the stored tokens, which stops every QuickBooks screen until someone with a
//   QuickBooks admin login connects again. It has its own capability so it can be assigned apart
//   from connecting, and it is never part of a read-only bundle. Admin only before the migration.
//
// requires: revoking is only offered on the connection page, which loads the status first.
export const qboConnectionCapabilities = createFeatureCapabilities({
  key: "qboConnection",
  resources: {
    connection: { shape: "singleton", verbs: ["read", "write"] },
    connectionRevocation: { shape: "singleton", verbs: ["write"] },
  },
  requires: {
    "connectionRevocation.write": ["qboConnection.connection.read"],
  },
});
