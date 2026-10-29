"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { prepayConfigSelect } from "../prepayConfigSelect";
import { prepayConfigActions } from "../prepayConfigSlice";
import { authSelect } from "@/app/auth/authSlice";
import { usePrepayConfig } from "../usePrepayConfig";
import { PrepayConfigOpenSheet } from "./PrepayConfigOpenSheet";
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
import type { PrepayConfig } from "../prepayConfigTypes";

const BLANK_CONFIG: Omit<PrepayConfig, "configId" | "name" | "saId"> = {
  selectionMode: "batch",
  season: new Date().getFullYear(),
  stdPrepayDiscPercent: 0,
  upsellPrepayDiscPercent: 0,
  showCreditBalance: false,
  showRemitBalance: false,
  expirationDate: "",
  autoRenewMessage: "",
  dontAutoRenewMessage: "",
  autoRenewHeader: "",
  dontAutoRenewHeader: "",
  universalMessage: "",
  currentServicesHeader: "",
  upsellServicesHeader: "",
};

export function PrepayConfigFileControls() {
  const dispatch = useAppDispatch();
  const draft = useSelector(prepayConfigSelect.draft);
  const activeName = useSelector(prepayConfigSelect.activeDisplayName);
  const isDirty = useSelector(prepayConfigSelect.isDirty);
  const ownConfigNames = useSelector(prepayConfigSelect.ownConfigNames);
  const currentSaId = useSelector(authSelect.user)?.saId;
  const { saveConfig, deleteConfig } = usePrepayConfig();

  const [openSheetVisible, setOpenSheetVisible] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleNew = () => {
    dispatch(
      prepayConfigActions.setDraft({
        configId: "",
        name: "",
        saId: currentSaId ?? "",
        ...BLANK_CONFIG,
      }),
    );
  };

  const handleSave = () => {
    if (draft) saveConfig(draft);
  };

  const handleSaveAs = ({ name }: { name: string }) => {
    if (!draft) return;
    // The server derives configId from name + saId, so a matching own name overwrites.
    saveConfig({ ...draft, configId: "", name, saId: currentSaId ?? "" });
  };

  const handleDelete = async () => {
    if (!draft?.configId) return;
    await deleteConfig(draft.configId);
    dispatch(prepayConfigActions.clearDraft());
    setDeleteConfirmOpen(false);
  };

  return (
    <>
      <EntityFileControls
        activeName={activeName}
        isDirty={isDirty}
        canSave={!!draft?.name}
        existingNames={ownConfigNames}
        onSaveAction={handleSave}
        onSaveAsAction={handleSaveAs}
        onNewAction={handleNew}
        onOpenAction={() => setOpenSheetVisible(true)}
        extraMenuItems={
          <DropdownMenuItem
            onSelect={() => setDeleteConfirmOpen(true)}
            disabled={!draft?.configId}
            className="text-destructive focus:text-destructive"
          >
            Delete…
          </DropdownMenuItem>
        }
      />

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Config?</DialogTitle>
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

      <PrepayConfigOpenSheet
        open={openSheetVisible}
        onCloseAction={() => setOpenSheetVisible(false)}
      />
    </>
  );
}
