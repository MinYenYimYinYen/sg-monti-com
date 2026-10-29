"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { formTemplateSelect } from "../formTemplateSelect";
import { formTemplateActions } from "../formTemplateSlice";
import { makeNewTemplate } from "../formTemplateFactory";
import { useFormTemplate } from "../useFormTemplate";
import { authSelect } from "@/app/auth/authSlice";
import { FormTemplateOpenSheet } from "./FormTemplateOpenSheet";
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

type FormTemplateFileControlsProps = {
  /** Data type used for New. Injected so this module never imports the registry. */
  defaultDataType: string;
};

export function FormTemplateFileControls({ defaultDataType }: FormTemplateFileControlsProps) {
  const dispatch = useAppDispatch();
  const draft = useSelector(formTemplateSelect.draft);
  const activeName = useSelector(formTemplateSelect.activeDisplayName);
  const isDirty = useSelector(formTemplateSelect.isDirty);
  const existingNames = useSelector(formTemplateSelect.existingNames);
  const currentSaId = useSelector(authSelect.user)?.saId ?? "";
  const { saveTemplate, deleteTemplate } = useFormTemplate();

  const [openSheetVisible, setOpenSheetVisible] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Only the owner can delete. The API enforces this; the UI just avoids offering it.
  const canDelete = !!draft?.templateId && !!currentSaId && draft.saId === currentSaId;

  const handleNew = () => {
    dispatch(
      formTemplateActions.setDraft(
        makeNewTemplate({ dataType: defaultDataType, saId: currentSaId }),
      ),
    );
  };

  const handleSave = () => {
    if (draft) saveTemplate(draft);
  };

  const handleSaveAs = ({ name }: { name: string }) => {
    if (!draft) return;
    // The server derives templateId from name + saId, so a matching own name overwrites.
    saveTemplate({ ...draft, templateId: "", templateName: name, saId: currentSaId });
  };

  const handleDelete = () => {
    if (!draft?.templateId) return;
    deleteTemplate(draft.templateId);
    setDeleteConfirmOpen(false);
  };

  return (
    <>
      <EntityFileControls
        activeName={activeName}
        isDirty={isDirty}
        canSave={!!draft?.templateName.trim()}
        existingNames={existingNames}
        onSaveAction={handleSave}
        onSaveAsAction={handleSaveAs}
        onNewAction={handleNew}
        onOpenAction={() => setOpenSheetVisible(true)}
        extraMenuItems={
          <DropdownMenuItem
            onSelect={() => setDeleteConfirmOpen(true)}
            disabled={!canDelete}
            className="text-destructive focus:text-destructive"
          >
            Delete…
          </DropdownMenuItem>
        }
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{draft?.templateName}&rdquo;. This cannot be undone.
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

      <FormTemplateOpenSheet
        open={openSheetVisible}
        onCloseAction={() => setOpenSheetVisible(false)}
      />
    </>
  );
}
