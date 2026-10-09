"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { SequenceMemberRow } from "@/app/pace/setup/groups/_components/SequenceMemberRow";
import { SequenceDialog } from "@/app/pace/setup/groups/_components/SequenceDialog";
import { useGroupSequence } from "@/app/pace/groupSequence/useGroupSequence";
import { SequenceWithGroups } from "@/app/pace/setup/setupSelect";

type SequenceCardProps = {
  sequenceWithGroups: SequenceWithGroups;
};

export function SequenceCard({ sequenceWithGroups }: SequenceCardProps) {
  const { deleteSequence } = useGroupSequence();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    void deleteSequence(sequenceWithGroups.sequenceId);
    setConfirmDelete(false);
  }

  return (
    <>
      <Accordion type="single" collapsible className="border border-border rounded mb-2">
        <AccordionItem value={sequenceWithGroups.sequenceId} className="border-0">
          {/* Custom header — AccordionTrigger + action buttons as siblings */}
          <div className="flex items-center px-3 hover:bg-accent/5">
            <AccordionTrigger className="flex-1 min-w-0 py-2.5 text-xs hover:no-underline [&[data-state=open]>svg]:rotate-180 p-0">
              <div className="flex items-center gap-2 min-w-0 mr-2">
                <span className="text-xs font-semibold text-foreground truncate">
                  {sequenceWithGroups.label}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {sequenceWithGroups.groups.length} group{sequenceWithGroups.groups.length !== 1 ? "s" : ""}
                </span>
                {sequenceWithGroups.daysSince > 0 && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    · {sequenceWithGroups.daysSince}d between rounds
                  </span>
                )}
              </div>
            </AccordionTrigger>

            {/* Action buttons — sibling of AccordionTrigger, not nested inside */}
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditOpen(true);
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                title="Edit sequence"
              >
                <Pencil className="w-3 h-3" />
              </button>

              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="text-[9px] text-destructive font-semibold hover:underline"
                  >
                    Del
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(false);
                    }}
                    className="text-[9px] text-muted-foreground hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete sequence"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <AccordionContent className="pb-0">
            <div className="border-t border-border/50">
              {sequenceWithGroups.groups.length === 0 ? (
                <p className="px-3 py-2 text-[10px] text-muted-foreground">
                  No groups in this sequence.
                </p>
              ) : (
                sequenceWithGroups.groups.map((group, index) => (
                  <SequenceMemberRow
                    key={group.groupId}
                    group={group}
                    position={index + 1}
                  />
                ))
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {editOpen && (
        <SequenceDialog
          sequence={sequenceWithGroups}
          open={editOpen}
          onCloseAction={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
