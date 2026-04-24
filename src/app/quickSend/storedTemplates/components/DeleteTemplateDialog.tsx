"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";

type DeleteTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string | null;
  onDelete: () => void;
};

export function DeleteTemplateDialog({
  open,
  onOpenChange,
  templateName,
  onDelete,
}: DeleteTemplateDialogProps) {
  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Delete Template</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{templateName}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="accent" intensity="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" variant="destructive" intensity="solid" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
