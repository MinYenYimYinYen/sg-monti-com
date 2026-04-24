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

type CreateGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
};

export function CreateGroupDialog({ open, onOpenChange, onCreate }: CreateGroupDialogProps) {
  const [name, setName] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create New Group</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Group Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name…"
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="accent" intensity="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" variant="primary" intensity="solid" onClick={handleCreate} disabled={!name.trim()}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
