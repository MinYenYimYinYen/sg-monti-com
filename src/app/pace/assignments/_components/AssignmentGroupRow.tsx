"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { AssignmentGroup } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

export function AssignmentGroupRow({
  group,
  onDelete,
  onUpdateLabel,
}: {
  group: AssignmentGroup;
  onDelete: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(group.label);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-border/50 hover:bg-accent/5">
      <div className="flex-1 min-w-0">
        {editingLabel ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdateLabel(group.groupId, labelDraft.trim() || group.label);
                  setEditingLabel(false);
                }
                if (e.key === "Escape") {
                  setLabelDraft(group.label);
                  setEditingLabel(false);
                }
              }}
              autoFocus
              className="h-5 text-[10px] px-1.5 rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-0"
            />
            <button
              onClick={() => {
                onUpdateLabel(group.groupId, labelDraft.trim() || group.label);
                setEditingLabel(false);
              }}
              className="p-0.5 rounded text-accent hover:bg-accent/10"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setLabelDraft(group.label);
                setEditingLabel(false);
              }}
              className="p-0.5 rounded text-muted-foreground hover:bg-accent/10"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground truncate">{group.label}</span>
            <button
              onClick={() => {
                setEditingLabel(true);
                setLabelDraft(group.label);
              }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors shrink-0"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {group.servCodeIds.map((id) => (
            <span key={id} className="font-mono text-[9px] text-primary bg-primary/10 rounded px-1">
              {id}
            </span>
          ))}
        </div>
      </div>
      <div className="shrink-0">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onDelete(group.groupId);
                setConfirmDelete(false);
              }}
              className="text-[9px] text-destructive font-semibold hover:underline"
            >
              Del
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[9px] text-muted-foreground hover:underline"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
