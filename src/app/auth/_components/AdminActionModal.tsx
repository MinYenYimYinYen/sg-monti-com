"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { useAuth } from "@/app/auth/_hooks/useAuth";
import { Modal } from "@/style/components/Modal";
import { TabControl } from "@/style/components/TabControl";
import { Button } from "@/style/components/Button";
import { Role, ROLES } from "@/lib/api/types/roles";
import { User } from "@/app/auth/_types/User";
import { PasswordResetRequest } from "@/app/auth/_types/PasswordResetRequest";
import { Input } from "@/style/components/Input";

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

  const tabs = [
    {
      id: "users",
      label: "Pending Users",
      content: <PendingUsersList users={pendingUsers} />,
      badge: pendingUsers.length > 0 ? pendingUsers.length : undefined,
    },
    {
      id: "resets",
      label: "Password Resets",
      content: <PendingResetsList requests={pendingResets} />,
      badge: pendingResets.length > 0 ? pendingResets.length : undefined,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Admin Actions"
      className="max-w-2xl"
    >
      <TabControl tabs={tabs} className="h-[500px]" />
    </Modal>
  );
}

// --- Sub-Components ---

function PendingUsersList({ users }: { users: User[] }) {
  const { approveUser } = useAuth();

  if (users.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sg-subtle">
        No pending user approvals.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {users.map((user) => (
        <li
          key={user.userName}
          className="flex flex-col gap-4 rounded-md border border-sg-blue-brdr/20 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-sg-text">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-sg-subtle">@{user.userName}</p>
            <p className="text-xs text-sg-subtle">SA ID: {user.saId}</p>
          </div>
          <div className="flex items-center gap-2">
            <RoleSelector
              onApprove={(role) =>
                approveUser({
                  userName: user.userName,
                  role,
                  loadingMsg: "Approving...",
                })
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RoleSelector({ onApprove }: { onApprove: (role: Role) => void }) {
  const [selectedRole, setSelectedRole] = useState<Role>("tech");

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value as Role)}
        className="h-9 rounded-md border border-sg-blue-brdr/30 bg-white px-3 py-1 text-sm focus:border-sg-blue-brdr focus:outline-none"
      >
        {ROLES.filter((r) => r !== "applied" && r !== "public").map((role) => (
          <option key={role} value={role}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </option>
        ))}
      </select>
      <Button size="sm" onClick={() => onApprove(selectedRole)}>
        Approve
      </Button>
    </div>
  );
}

function PendingResetsList({ requests }: { requests: PasswordResetRequest[] }) {
  const { resolvePasswordReset } = useAuth();
  const [tempPassword, setTempPassword] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sg-subtle">
        No pending password resets.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {requests.map((req) => (
        <li
          key={req.userName}
          className="flex flex-col gap-4 rounded-md border border-sg-blue-brdr/20 p-4"
        >
          <div className="flex justify-between">
            <div>
              <p className="font-medium text-sg-text">
                {req.firstName} {req.lastName}
              </p>
              <p className="text-sm text-sg-subtle">@{req.userName}</p>
            </div>
            <div className="text-xs text-sg-subtle">
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
                disabled={!tempPassword}
                onClick={() => {
                  resolvePasswordReset({
                    userName: req.userName,
                    tempPassword,
                    loadingMsg: "Resetting...",
                  });
                  setActiveId(null);
                  setTempPassword("");
                }}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
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
