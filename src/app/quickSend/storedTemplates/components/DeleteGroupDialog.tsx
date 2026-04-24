"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Input } from "@/style/components/input";
import { Button } from "@/style/components/button";
import { StoredTemplateDoc, TemplateGroupDoc } from "../StoredTemplateTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TemplateResolution =
  | { type: "move"; groupId: string }
  | { type: "delete" }
  | { type: "newGroup"; name: string }
  | null;

type DeleteGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: TemplateGroupDoc;
  templatesInGroup: StoredTemplateDoc[];
  otherGroups: TemplateGroupDoc[];
  currentUserSaId: string | null;
  onConfirm: (groupId: string, resolutions: Map<string, TemplateResolution>) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeleteGroupDialog({
  open,
  onOpenChange,
  group,
  templatesInGroup,
  otherGroups,
  currentUserSaId,
  onConfirm,
}: DeleteGroupDialogProps) {
  const [resolutions, setResolutions] = useState<Map<string, TemplateResolution>>(new Map());
  const [newGroupNames, setNewGroupNames] = useState<Map<string, string>>(new Map());

  const setResolution = (templateId: string, resolution: TemplateResolution) => {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(templateId, resolution);
      return next;
    });
  };

  const setNewGroupName = (templateId: string, name: string) => {
    setNewGroupNames((prev) => {
      const next = new Map(prev);
      next.set(templateId, name);
      return next;
    });
    setResolution(templateId, { type: "newGroup", name });
  };

  const allResolved =
    templatesInGroup.length === 0 ||
    templatesInGroup.every((t) => {
      const r = resolutions.get(t.templateId);
      if (!r) return false;
      if (r.type === "newGroup") return !!r.name.trim();
      return true;
    });

  const handleConfirm = () => {
    onConfirm(group.groupId, resolutions);
    onOpenChange(false);
    setResolutions(new Map());
    setNewGroupNames(new Map());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Group: {group.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {templatesInGroup.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This group is empty. It will be deleted immediately.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Resolve each template before deleting the group:
              </p>
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                {templatesInGroup.map((template) => {
                  const isOwn = template.saId === currentUserSaId;
                  const resolution = resolutions.get(template.templateId) ?? null;
                  const newGroupName = newGroupNames.get(template.templateId) ?? "";

                  return (
                    <div key={template.templateId} className="flex flex-col gap-1 border border-border rounded p-2">
                      <p className="text-xs font-medium truncate">{template.name}</p>
                      <p className="text-[10px] text-muted-foreground">{template.saId}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        {otherGroups.length > 0 && (
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name={`res-${template.templateId}`}
                              checked={resolution?.type === "move"}
                              onChange={() =>
                                setResolution(template.templateId, {
                                  type: "move",
                                  groupId: otherGroups[0].groupId,
                                })
                              }
                            />
                            Move to:
                            <select
                              className="flex-1 h-6 rounded border border-input bg-card px-1 text-xs"
                              value={resolution?.type === "move" ? resolution.groupId : otherGroups[0].groupId}
                              onChange={(e) =>
                                setResolution(template.templateId, {
                                  type: "move",
                                  groupId: e.target.value,
                                })
                              }
                              onClick={() => {
                                if (resolution?.type !== "move") {
                                  setResolution(template.templateId, {
                                    type: "move",
                                    groupId: otherGroups[0].groupId,
                                  });
                                }
                              }}
                            >
                              {otherGroups.map((g) => (
                                <option key={g.groupId} value={g.groupId}>{g.name}</option>
                              ))}
                            </select>
                          </label>
                        )}
                        {isOwn && (
                          <label className="flex items-center gap-2 text-xs cursor-pointer text-destructive">
                            <input
                              type="radio"
                              name={`res-${template.templateId}`}
                              checked={resolution?.type === "delete"}
                              onChange={() => setResolution(template.templateId, { type: "delete" })}
                            />
                            Delete this template
                          </label>
                        )}
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name={`res-${template.templateId}`}
                            checked={resolution?.type === "newGroup"}
                            onChange={() =>
                              setResolution(template.templateId, { type: "newGroup", name: newGroupName })
                            }
                          />
                          New group:
                          <Input
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(template.templateId, e.target.value)}
                            placeholder="Group name…"
                            className="flex-1 h-6 text-xs px-1"
                            onClick={() => {
                              if (resolution?.type !== "newGroup") {
                                setResolution(template.templateId, { type: "newGroup", name: newGroupName });
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="accent" intensity="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              intensity="solid"
              onClick={handleConfirm}
              disabled={!allResolved}
            >
              Delete Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
