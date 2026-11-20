"use client";

import { useSelector } from "react-redux";
import Link from "next/link";
import { authSelect } from "@/app/auth/authSlice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { Button } from "@/style/components/button";

// Approving a user means giving them capabilities, which is done in Users and Bundles. This
// list only shows who is waiting. The list reloads on the next page load, and the approved
// user leaves it once they hold something.
export function PendingUsersList({
  onCloseAction,
}: {
  onCloseAction: () => void;
}) {
  const pendingUsers = useSelector(authSelect.adminPendingUsers);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canAssign = allows(can.userCapabilities.read);

  if (pendingUsers.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No users are waiting for access.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        These users can sign in but hold no permissions yet.
        {canAssign ? " Give them access in Users and Bundles." : ""}
      </p>
      <ul className="space-y-2">
        {pendingUsers.map((user) => (
          <li
            key={user.userName}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{user.userName} · SA ID: {user.saId}
              </p>
            </div>
            {canAssign && (
              <Button
                asChild
                size="sm"
                variant="primary"
                intensity="ghost"
                className="h-7 shrink-0 text-xs"
              >
                <Link href="/permission/users" onClick={onCloseAction}>
                  Assign access
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
