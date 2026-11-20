"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";

export function PendingResetsList() {
  const pendingResets = useSelector(authSelect.adminPendingResets);
  const { resolvePasswordReset } = useAuth();
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.accessRequests.write);
  const [tempPassword, setTempPassword] = useState("");
  const [activeUserName, setActiveUserName] = useState<string | null>(null);

  function stopEditing() {
    setActiveUserName(null);
    setTempPassword("");
  }

  if (pendingResets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No pending password resets.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {pendingResets.map((request) => (
        <li
          key={request.userName}
          className="space-y-3 rounded-md border border-border bg-card p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {request.firstName} {request.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                @{request.userName}
              </p>
            </div>
            {request.createdAt && (
              <p className="shrink-0 text-xs text-muted-foreground">
                Requested {new Date(request.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {activeUserName === request.userName ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!tempPassword || !canWrite) return;
                resolvePasswordReset({
                  userName: request.userName,
                  tempPassword,
                });
                stopEditing();
              }}
            >
              <Input
                type="text"
                placeholder="New Temp Password"
                value={tempPassword}
                onChange={(event) => setTempPassword(event.target.value)}
                className="h-8"
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                className="h-8"
                disabled={!tempPassword || !canWrite}
              >
                Confirm
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={stopEditing}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!canWrite}
              onClick={() => setActiveUserName(request.userName)}
            >
              Reset Password
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
