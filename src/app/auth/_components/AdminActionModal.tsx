"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import type { UserSummary } from "@/permission/logic/userSummary";
import { PasswordResetRequest } from "@/app/auth/_types/PasswordResetRequest";
import { Input } from "@/style/components/input";
import { Button } from "@/style/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/style/components/tabs";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

interface AdminActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminActionModal({
  isOpen,
  onClose,
}: AdminActionModalProps) {
  const pendingUsers = useSelector(authSelect.adminPendingUsers);
  const pendingResets = useSelector(authSelect.adminPendingResets);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Actions"
      className="max-w-2xl"
    >
      <Tabs defaultValue="users" className="flex h-[500px] flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">
            Pending Users
            {pendingUsers.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-xs font-bold text-destructive-foreground">
                {pendingUsers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resets">
            Password Resets
            {pendingResets.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-xs font-bold text-destructive-foreground">
                {pendingResets.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="flex-1 overflow-auto p-1">
          <PendingUsersList users={pendingUsers} onCloseAction={onClose} />
        </TabsContent>
        <TabsContent value="resets" className="flex-1 overflow-auto p-1">
          <PendingResetsList requests={pendingResets} />
        </TabsContent>
      </Tabs>
    </Modal>
  );
}

// --- Sub-Components ---

// Approving a user means giving them capabilities, which is done in Users and Bundles. This
// list only shows who is waiting. The list reloads on the next page load, and the approved
// user leaves it once they hold something.
function PendingUsersList({ users, onCloseAction }: { users: UserSummary[]; onCloseAction: () => void }) {
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canAssign = allows(can.userCapabilities.read);

  if (users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No users are waiting for access.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These users can sign in but hold no permissions yet.
        {canAssign ? " Give them access in Users and Bundles." : ""}
      </p>
      <ul className="space-y-4">
        {users.map((user) => (
          <li
            key={user.userName}
            className="flex flex-col gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-muted-foreground">@{user.userName}</p>
              <p className="text-xs text-muted-foreground">SA ID: {user.saId}</p>
            </div>
            {canAssign && (
              <Button asChild size="sm" variant="outline">
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

function PendingResetsList({ requests }: { requests: PasswordResetRequest[] }) {
  const { resolvePasswordReset } = useAuth();
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.accessRequests.write);
  const [tempPassword, setTempPassword] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No pending password resets.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {requests.map((req) => (
        <li
          key={req.userName}
          className="flex flex-col gap-4 rounded-md border border-border p-4"
        >
          <div className="flex justify-between">
            <div>
              <p className="font-medium text-foreground">
                {req.firstName} {req.lastName}
              </p>
              <p className="text-sm text-muted-foreground">@{req.userName}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              Requested: {new Date(req.createdAt || "").toLocaleDateString()}
            </div>
          </div>

          {activeId === req.userName ? (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="New Temp Password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="h-9"
              />
              <Button
                size="sm"
                disabled={!tempPassword || !canWrite}
                onClick={() => {
                  resolvePasswordReset({
                    userName: req.userName,
                    tempPassword,
                  });
                  setActiveId(null);
                  setTempPassword("");
                }}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActiveId(null);
                  setTempPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled={!canWrite}
              onClick={() => setActiveId(req.userName)}
            >
              Reset Password
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
