"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { authSelect } from "@/app/auth/authSlice";
import { upsellPrioritiesSelect } from "../upsellPrioritiesSelect";
import { upsellPrioritiesActions } from "../upsellPrioritiesSlice";
import { useUpsellPriorities } from "../useUpsellPriorities";
import { UpsellPrioritiesOpenSheet } from "./UpsellPrioritiesOpenSheet";
import { EntityFileControls } from "@/components/EntityFileControls/EntityFileControls";
import { DropdownMenuItem } from "@/style/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";

export function UpsellPrioritiesFileControls() {
  const dispatch = useAppDispatch();
  const draft = useSelector(upsellPrioritiesSelect.draft);
  const activeName = useSelector(upsellPrioritiesSelect.activeDisplayName);
  const isDirty = useSelector(upsellPrioritiesSelect.isDirty);
  const ownNames = useSelector(upsellPrioritiesSelect.ownNames);
  const currentSaId = useSelector(authSelect.user)?.saId;
  const { saveUpsellPriorities, deleteUpsellPriorities } = useUpsellPriorities();

  const [openSheetVisible, setOpenSheetVisible] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function handleNew() {
    dispatch(
      upsellPrioritiesActions.setDraft({
        upsellPrioritiesId: "",
        name: "",
        saId: currentSaId ?? "",
        priorities: [],
      }),
    );
  }

  function handleSave() {
    if (draft) saveUpsellPriorities(draft);
  }

  function handleSaveAs({ name }: { name: string }) {
    if (!draft) return;
    // The server derives the id from name + saId, so a matching own name overwrites.
    saveUpsellPriorities({ ...draft, upsellPrioritiesId: "", name, saId: currentSaId ?? "" });
  }

  async function handleDelete() {
    if (!draft?.upsellPrioritiesId) return;
    await deleteUpsellPriorities(draft.upsellPrioritiesId);
    dispatch(upsellPrioritiesActions.clearDraft());
    setDeleteConfirmOpen(false);
  }

  return (
    <>
      <EntityFileControls
        activeName={activeName}
        isDirty={isDirty}
        canSave={!!draft?.name && (!draft.saId || draft.saId === currentSaId)}
        existingNames={ownNames}
        onSaveAction={handleSave}
        onSaveAsAction={handleSaveAs}
        onNewAction={handleNew}
        onOpenAction={() => setOpenSheetVisible(true)}
        extraMenuItems={
          <DropdownMenuItem
            onSelect={() => setDeleteConfirmOpen(true)}
            disabled={!draft?.upsellPrioritiesId || draft.saId !== currentSaId}
            className="text-destructive focus:text-destructive"
          >
            Delete…
          </DropdownMenuItem>
        }
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Upsell Priorities?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{draft?.name}&rdquo;. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpsellPrioritiesOpenSheet
        open={openSheetVisible}
        onCloseAction={() => setOpenSheetVisible(false)}
      />
    </>
  );
}
