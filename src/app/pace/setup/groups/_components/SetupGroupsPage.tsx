"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import { setupSelect } from "@/app/pace/setup/setupSelect";
import { SequenceCard } from "@/app/pace/setup/groups/_components/SequenceCard";
import { GroupListItem } from "@/app/pace/setup/groups/_components/GroupListItem";
import { GroupDialog } from "@/app/pace/setup/groups/_components/GroupDialog";
import { SequenceDialog } from "@/app/pace/setup/groups/_components/SequenceDialog";

export function SetupGroupsPage() {
  const sequencesWithGroups = useSelector(setupSelect.sequencesWithGroups);
  const standaloneGroups = useSelector(setupSelect.standaloneGroups);

  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newSequenceOpen, setNewSequenceOpen] = useState(false);
  const [search, setSearch] = useState("");

  const searchLower = search.toLowerCase();

  const filteredSequences = search
    ? sequencesWithGroups.filter(
        (s) =>
          s.label.toLowerCase().includes(searchLower) ||
          s.groups.some(
            (g) =>
              g.label.toLowerCase().includes(searchLower) ||
              g.servCodeIds.some((id) => id.toLowerCase().includes(searchLower)),
          ),
      )
    : sequencesWithGroups;

  const filteredStandaloneGroups = search
    ? standaloneGroups.filter(
        (g) =>
          g.label.toLowerCase().includes(searchLower) ||
          g.servCodeIds.some((id) => id.toLowerCase().includes(searchLower)),
      )
    : standaloneGroups;

  const isEmpty = filteredSequences.length === 0 && filteredStandaloneGroups.length === 0;

  return (
    <>
      <div className="h-full overflow-y-auto">
        {/* Toolbar */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNewGroupOpen(true)}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Group
            </button>
            <button
              onClick={() => setNewSequenceOpen(true)}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Sequence
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="h-7 text-xs px-2.5 rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44"
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-1">
          {isEmpty && (
            <p className="text-sm text-muted-foreground text-center py-12">
              {search ? "No groups or sequences match your search." : "No groups defined yet. Create a group to get started."}
            </p>
          )}

          {/* Sequences */}
          {filteredSequences.map((sequenceWithGroups) => (
            <SequenceCard
              key={sequenceWithGroups.sequenceId}
              sequenceWithGroups={sequenceWithGroups}
            />
          ))}

          {/* Standalone groups */}
          {filteredStandaloneGroups.length > 0 && (
            <div className="border border-border rounded overflow-hidden">
              {filteredStandaloneGroups.map((group) => (
                <GroupListItem key={group.groupId} group={group} />
              ))}
            </div>
          )}
        </div>
      </div>

      {newGroupOpen && (
        <GroupDialog
          group={null}
          open={newGroupOpen}
          onCloseAction={() => setNewGroupOpen(false)}
        />
      )}

      {newSequenceOpen && (
        <SequenceDialog
          sequence={null}
          open={newSequenceOpen}
          onCloseAction={() => setNewSequenceOpen(false)}
        />
      )}
    </>
  );
}
