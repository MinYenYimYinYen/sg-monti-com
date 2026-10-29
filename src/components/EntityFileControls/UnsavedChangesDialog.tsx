"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";

type UnsavedChangesDialogProps = {
  open: boolean;
  entityName: string | null;
  onDiscardAction: () => void;
  onCancelAction: () => void;
};

export function UnsavedChangesDialog({
  open,
  entityName,
  onDiscardAction,
  onCancelAction,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancelAction(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>
            {entityName ? `Changes to \u201C${entityName}\u201D` : "Your changes"} have not been saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button size="sm" variant="outline" onClick={onCancelAction}>
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={onDiscardAction}>
            Discard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
