"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { prepayConfigSelect } from "../prepayConfigSelect";
import { prepayConfigActions } from "../prepayConfigSlice";
import { authSelect } from "@/app/auth/authSlice";
import { usePrepayConfig } from "../usePrepayConfig";
import { PrepayConfigOpenSheet } from "./PrepayConfigOpenSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { ChevronDown } from "lucide-react";
import type { PrepayConfigDoc } from "../prepayConfigTypes";

const BLANK_CONFIG: Omit<PrepayConfigDoc, "configId" | "name" | "saId"> = {
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
};

export function PrepayConfigFileMenu() {
  const dispatch = useAppDispatch();
  const draft = useSelector(prepayConfigSelect.draft);
  const currentSaId = useSelector(authSelect.user)?.saId;
  const role = useSelector(authSelect.role);
  const { saveConfig, deleteConfig } = usePrepayConfig();

  const [openSheetVisible, setOpenSheetVisible] = useState(false);
  const [saveAsPopoverOpen, setSaveAsPopoverOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isOwner =
    !draft?.saId || draft.saId === currentSaId || role === "admin";
  const canSave = !!draft?.name && isOwner;
  const canDelete = !!draft?.configId && isOwner;

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
    if (!draft || !canSave) return;
    saveConfig(draft);
  };

  const handleSaveAs = () => {
    if (!draft || !saveAsName.trim()) return;
    const newDoc: PrepayConfigDoc = {
      ...draft,
      configId: "", // server will generate
      name: saveAsName.trim(),
      saId: currentSaId ?? "",
    };
    saveConfig(newDoc);
    setSaveAsPopoverOpen(false);
    setSaveAsName("");
  };

  const handleDelete = async () => {
    if (!draft?.configId) return;
    await deleteConfig(draft.configId);
    dispatch(prepayConfigActions.clearDraft());
    setDeleteConfirmOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            File
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onSelect={handleNew}>New Config</DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={() => setOpenSheetVisible(true)}>
            Open…
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={handleSave} disabled={!canSave}>
            Save
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setSaveAsName(draft?.name ?? "");
              setSaveAsPopoverOpen(true);
            }}
            disabled={!draft}
          >
            Save As…
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDeleteConfirmOpen(true);
            }}
            disabled={!canDelete}
            className="text-destructive focus:text-destructive"
          >
            Delete…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save As popover — anchored to a hidden trigger */}
      <Popover open={saveAsPopoverOpen} onOpenChange={setSaveAsPopoverOpen}>
        <PopoverTrigger asChild>
          <span className="sr-only" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="start">
          <p className="text-xs font-semibold">Save As New Config</p>
          <div className="space-y-1">
            <Label className="text-xs">Config Name</Label>
            <Input
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="e.g. November Letters"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveAs();
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={!saveAsName.trim()}
              onClick={handleSaveAs}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSaveAsPopoverOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete confirm popover */}
      <Popover open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <PopoverTrigger asChild>
          <span className="sr-only" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 space-y-3" align="start">
          <p className="text-xs font-semibold text-destructive">Delete Config?</p>
          <p className="text-xs text-muted-foreground">
            This will permanently delete &ldquo;{draft?.name}&rdquo;. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <PrepayConfigOpenSheet
        open={openSheetVisible}
        onClose={() => setOpenSheetVisible(false)}
      />
    </>
  );
}
