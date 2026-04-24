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
import { Label } from "@/style/components/label";
import { TemplateGroupDoc } from "../StoredTemplateTypes";

type SaveAsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: TemplateGroupDoc[];
  onSave: (name: string, groupId: string) => void;
};

export function SaveAsDialog({ open, onOpenChange, groups, onSave }: SaveAsDialogProps) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.groupId ?? "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), groupId || groups[0]?.groupId || "ungrouped");
    setName("");
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setGroupId(groups[0]?.groupId ?? "");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Save As New Template</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name…"
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Group</Label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              {groups.length === 0 ? (
                <option value="" disabled>No groups yet</option>
              ) : (
                groups.map((g) => (
                  <option key={g.groupId} value={g.groupId}>{g.name}</option>
                ))
              )}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="accent" intensity="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" variant="primary" intensity="solid" onClick={handleSave} disabled={!name.trim()}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
