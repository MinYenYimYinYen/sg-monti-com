"use client";

import { useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import { Button } from "@/style/components/button";
import { ChevronDown, Save, SaveAll } from "lucide-react";
import { SaveAsDialog } from "./SaveAsDialog";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";

export type EntityFileControlsProps = {
  /** Display name of the active entity. null = no active entity (Save / Save As are not rendered). */
  activeName: string | null;
  isDirty: boolean;
  /** Consumer-supplied extra restriction on Save. Defaults to true. */
  canSave?: boolean;
  /** Renders Save As. Defaults to true. */
  supportsMultiple?: boolean;
  /** Confirm before New / Open discards unsaved changes. Defaults to true. */
  warnOnUnsavedChanges?: boolean;
  /** Names that a Save As could collide with. */
  existingNames?: string[];
  onSaveAction: () => void;
  onSaveAsAction?: (params: { name: string }) => void;
  onNewAction: () => void;
  onOpenAction: () => void;
  /** Extra File menu entries (e.g. Delete), rendered after a separator. */
  extraMenuItems?: ReactNode;
};

type GuardedAction = "new" | "open";

/**
 * Standard header cluster for a draft-based named entity:
 * `[File ▾] [active name] [unsaved] [Save] [Save As]`.
 * See `.claude/skills/entity-file-menu/SKILL.md`.
 */
export function EntityFileControls({
  activeName,
  isDirty,
  canSave = true,
  supportsMultiple = true,
  warnOnUnsavedChanges = true,
  existingNames = [],
  onSaveAction,
  onSaveAsAction,
  onNewAction,
  onOpenAction,
  extraMenuItems,
}: EntityFileControlsProps) {
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<GuardedAction | null>(null);

  const hasActive = activeName !== null;

  const run = (action: GuardedAction) => {
    if (action === "new") onNewAction();
    else onOpenAction();
  };

  const guarded = (action: GuardedAction) => {
    if (warnOnUnsavedChanges && isDirty) {
      setPendingAction(action);
      return;
    }
    run(action);
  };

  return (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              File
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onSelect={() => guarded("new")}>New</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => guarded("open")}>Open…</DropdownMenuItem>
            {extraMenuItems && (
              <>
                <DropdownMenuSeparator />
                {extraMenuItems}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActive && (
          <>
            <span className="text-sm font-medium text-foreground truncate max-w-64">
              {activeName || "Untitled"}
            </span>
            {isDirty && (
              <span className="text-[10px] text-secondary font-semibold uppercase tracking-wide shrink-0">
                unsaved
              </span>
            )}

            <Button
              variant="secondary"
              intensity="soft"
              size="sm"
              disabled={!isDirty || !canSave}
              onClick={onSaveAction}
              title="Save changes"
            >
              <Save />
              Save
            </Button>

            {supportsMultiple && onSaveAsAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveAsOpen(true)}
                title="Save as a new name"
              >
                <SaveAll />
                Save As
              </Button>
            )}
          </>
        )}
      </div>

      {supportsMultiple && onSaveAsAction && (
        <SaveAsDialog
          open={saveAsOpen}
          initialName={activeName ? `${activeName} copy` : ""}
          existingNames={existingNames}
          onSaveAsAction={onSaveAsAction}
          onCloseAction={() => setSaveAsOpen(false)}
        />
      )}

      <UnsavedChangesDialog
        open={pendingAction !== null}
        entityName={activeName}
        onCancelAction={() => setPendingAction(null)}
        onDiscardAction={() => {
          if (pendingAction) run(pendingAction);
          setPendingAction(null);
        }}
      />
    </>
  );
}
