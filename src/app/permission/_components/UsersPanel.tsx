"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { CreateUserDialog } from "@/app/permission/_components/CreateUserDialog";
import { UserCapabilityEditor } from "@/app/permission/_components/UserCapabilityEditor";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { matchesUserSearch } from "@/permission/logic/userSummary";
import { Input } from "@/style/components/input";
import { cn } from "@/style/utils";

function KindTag({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground", className)}>{children}</span>;
}

/** Everyone who can log in, with their bundles and direct capabilities. */
export function UsersPanel() {
  const users = useSelector(userCapabilitiesSelect.users);
  const effectiveByUserName = useSelector(userCapabilitiesSelect.effectiveByUserName);
  const mine = useSelector(userCapabilitiesSelect.mine);
  const [search, setSearch] = useState("");
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);

  const visibleUsers = users.filter((user) => matchesUserSearch({ user, search }));

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex min-h-0 w-80 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Input placeholder="Search users..." value={search} onChange={(event) => setSearch(event.target.value)} />
          {mine?.isSuperUser && <CreateUserDialog />}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visibleUsers.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">{users.length === 0 ? "No users loaded." : "No match."}</li>
          )}
          {visibleUsers.map((user) => {
            const hasNoAccess = !user.isSuperUser && (effectiveByUserName[user.userName]?.length ?? 0) === 0;
            return (
              <li key={user.userName}>
                <button
                  type="button"
                  onClick={() => setSelectedUserName(user.userName)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 border-b border-border/50 px-3 py-2 text-left hover:bg-accent/10",
                    user.userName === selectedUserName && "bg-primary/15",
                  )}
                >
                  <span className="text-sm font-medium text-foreground">
                    {user.lastName}, {user.firstName}
                  </span>
                  <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    @{user.userName}
                    {user.isSuperUser && <KindTag className="bg-secondary/20">Superuser</KindTag>}
                    {user.isKiosk && <KindTag className="bg-accent/20">Kiosk</KindTag>}
                    {hasNoAccess && <KindTag className="bg-destructive/15">No access</KindTag>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="h-full min-h-0 flex-1 overflow-y-auto">
        {selectedUserName ? (
          <UserCapabilityEditor key={selectedUserName} userName={selectedUserName} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a user to see and change what they can do.
          </div>
        )}
      </section>
    </div>
  );
}
