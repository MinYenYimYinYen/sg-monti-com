import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// The admin side of sign-up and password resets: people waiting for approval, and password reset
// requests. Not declared here: login, register, logout, refresh, checkAuth, checkEligibility,
// requestPasswordReset, confirmPassword and changePassword are `public` (the last two verify the
// cookie themselves), and createUser and deleteUser are 'superUser', which cannot be granted.
//
// accessRequests.read  -> auth getPendingActions (applied users and pending password resets)
// accessRequests.write -> auth approveUser, resolvePasswordReset
//
// approveUser sets a role, and roles still gate every route that has not migrated, so holding
// write can make someone an admin until roles are removed. Assign it deliberately. approveUser goes
// away with roles (approval becomes assigning capabilities). resolvePasswordReset stays, and
// shares write with it only by default: split it into its own resource if password resets should
// be assigned apart from approvals.
export const authCapabilities = createFeatureCapabilities({
  key: "auth",
  resources: {
    accessRequests: { shape: "collection", verbs: ["read", "write"] },
  },
});
