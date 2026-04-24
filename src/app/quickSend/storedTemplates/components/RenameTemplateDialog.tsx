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

type RenameTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  onRename: (newName: string) => void;
};

export function RenameTemplateDialog({
  open,
  onOpenChange,
  initialName,
  onRename,
}: RenameTemplateDialogProps) {
  const [name, setName] = useState(initialName);

  const handleRename = () => {
    if (!name.trim()) return;
    onRename(name.trim());
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setName(initialName);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Rename Template</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">New Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New name…"
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="accent" intensity="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" variant="primary" intensity="solid" onClick={handleRename} disabled={!name.trim()}>Rename</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
