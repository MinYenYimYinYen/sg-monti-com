"use client";

import { useState } from "react";
import { GroupNavPanel } from "@/app/pace/setup/groups/_components/GroupNavPanel";
import { GroupGoalPanel } from "@/app/pace/setup/groups/_components/GroupGoalPanel";

export function SetupGroupsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  function handleGroupDeleted(groupId: string) {
    if (selectedGroupId === groupId) setSelectedGroupId(null);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — group/sequence navigator */}
      <div className="w-56 shrink-0">
        <GroupNavPanel
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          onGroupDeleted={handleGroupDeleted}
        />
      </div>

      {/* Right panel — group goal editor */}
      <div className="flex-1 min-w-0">
        {selectedGroupId ? (
          <GroupGoalPanel key={selectedGroupId} groupId={selectedGroupId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              Select a group from the left panel to view and edit goals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
