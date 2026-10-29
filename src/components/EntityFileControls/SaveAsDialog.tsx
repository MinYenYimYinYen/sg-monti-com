"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";

type SaveAsDialogProps = {
  open: boolean;
  initialName: string;
  /** Names the user could collide with. Compared trimmed and case-insensitively. */
  existingNames: string[];
  onSaveAsAction: (params: { name: string }) => void;
  onCloseAction: () => void;
};

const normalize = (name: string) => name.trim().toLowerCase();

/**
 * Name prompt for Save As. Collisions are surfaced inline and the confirm button
 * becomes a destructive "Overwrite". Whether the overwrite is actually permitted
 * is decided by the API, not here.
 */
export function SaveAsDialog({
  open,
  initialName,
  existingNames,
  onSaveAsAction,
  onCloseAction,
}: SaveAsDialogProps) {
  // Remounted via `key` each time the dialog opens, so state initializes from props.
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCloseAction(); }}>
      <DialogContent className="max-w-sm">
        {open && (
          <SaveAsForm
            key={initialName}
            initialName={initialName}
            existingNames={existingNames}
            onSaveAsAction={onSaveAsAction}
            onCloseAction={onCloseAction}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type SaveAsFormProps = Omit<SaveAsDialogProps, "open">;

function SaveAsForm({ initialName, existingNames, onSaveAsAction, onCloseAction }: SaveAsFormProps) {
  const [name, setName] = useState(initialName);

  const trimmed = name.trim();
  const hasConflict =
    trimmed !== "" && existingNames.some((existing) => normalize(existing) === normalize(trimmed));

  const submit = () => {
    if (!trimmed) return;
    onSaveAsAction({ name: trimmed });
    onCloseAction();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Save As</DialogTitle>
      </DialogHeader>

      <div className="space-y-1">
        <Label className="text-xs">Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {hasConflict && (
          <p className="text-xs text-secondary">
            &ldquo;{trimmed}&rdquo; already exists. Saving will overwrite it.
          </p>
        )}
      </div>

      <DialogFooter>
        <Button size="sm" variant="outline" onClick={onCloseAction}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant={hasConflict ? "destructive" : "primary"}
          disabled={!trimmed}
          onClick={submit}
        >
          {hasConflict ? "Overwrite" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
