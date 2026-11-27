"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { Badge } from "@/style/components/badge";
import { AppMethod } from "./AppMethodTypes";
import { useAppMethod } from "./useAppMethod";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";

interface AppMethodDeleteSheetProps {
  method: AppMethod;
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onDeleteCompleteAction?: () => void;
}

export function AppMethodDeleteSheet({
  method,
  open,
  onOpenChangeAction,
  onDeleteCompleteAction,
}: AppMethodDeleteSheetProps) {
  const { deleteAppMethod } = useAppMethod({});
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canDelete = allows(can.appMethods.delete);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAppMethod({ appMethod: method });
      onDeleteCompleteAction?.();
      onOpenChangeAction(false);
    } catch (error) {
      console.error("Error deleting AppMethod:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChangeAction}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Delete Application Method</SheetTitle>
          <SheetDescription>
            This permanently removes the application method.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{method.appMethodId}</Badge>
            <span className="text-sm text-muted-foreground">
              {method.description}
            </span>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChangeAction(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || !canDelete}
          >
            {isDeleting ? "Deleting…" : "Delete Method"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}