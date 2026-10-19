"use client";

import { useState } from "react";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";
import { MentionEditor } from "@/components/MentionEditor/MentionEditor";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { prettyDate } from "@/lib/primatives/dates/prettyDate";
import { DatePicker } from "@/components/DatePicker";
import { MentionEditorUtils } from "@/components/MentionEditor/MentionEditorUtils";

// ---------------------------------------------------------------------------
// RouteNoteVars — empty for now, extend as needs arise
// ---------------------------------------------------------------------------

// No parsers needed for an empty var set.
const EMPTY_VARS = {} as Record<string, never>;
const EMPTY_PARSERS = {} as Record<string, never>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type RouteNoteEditorProps = {
  /** The existing note to edit, or null to create a new one. */
  note: RouteNote | null;
  /** Pre-filled values for a new note (ignored when note is provided). */
  defaults: {
    schedDate: string;
    employeeId: string | null;
    employeeName?: string;
  };
  isOpen: boolean;
  onCloseAction: () => void;
  onSaveAction: (note: RouteNote) => void;
  onDeleteAction: (routeNoteId: string) => void;
};

// ---------------------------------------------------------------------------
// RouteNoteEditor
// ---------------------------------------------------------------------------

export function RouteNoteEditor({
  note,
  defaults,
  isOpen,
  onCloseAction,
  onSaveAction,
  onDeleteAction,
}: RouteNoteEditorProps) {
  const isNew = note === null;
  const schedDate = note?.schedDate ?? defaults.schedDate;
  const employeeId = note?.employeeId ?? defaults.employeeId;
  const employeeName = defaults.employeeName;
  const isDayNote = employeeId === null;

  const [noteHtml, setNoteHtml] = useState(note?.noteHtml ?? "");
  const [showOnCoverSheet, setShowOnCoverSheet] = useState(
    note?.showOnCoverSheet ?? !isDayNote,
  );
  const [showInCrewLeadSummary, setShowInCrewLeadSummary] = useState(
    note?.showInCrewLeadSummary ?? true,
  );
  // "Move to" date — only relevant when editing an existing note.
  // Empty string means "keep on the original date".
  const [moveToDate, setMoveToDate] = useState("");

  const formattedDate = prettyDate(schedDate, "EEE, MMM d");

  const title = isDayNote
    ? `Day Note — ${formattedDate}`
    : `Note for ${employeeName ?? employeeId} — ${formattedDate}`;

  function handleSave() {
    const effectiveDate = (!isNew && moveToDate) ? moveToDate : schedDate;
    const doc: RouteNote = {
      routeNoteId: note?.routeNoteId ?? crypto.randomUUID(),
      schedDate: effectiveDate,
      employeeId,
      noteHtml,
      // Resolve to plain text at save time so consumers (PDF, clipboard) can use it directly.
      note: MentionEditorUtils.resolve(noteHtml, EMPTY_VARS, EMPTY_PARSERS),
      showOnCoverSheet: isDayNote ? false : showOnCoverSheet,
      showInCrewLeadSummary: isDayNote ? true : showInCrewLeadSummary,
      createdAt: note?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveAction(doc);
    onCloseAction();
  }

  function handleDelete() {
    if (note) {
      onDeleteAction(note.routeNoteId);
      onCloseAction();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCloseAction()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Note editor */}
        <div className="flex flex-col gap-3">
          <MentionEditor
            value={noteHtml}
            onChangeAction={setNoteHtml}
            vars={EMPTY_VARS}
            parsers={EMPTY_PARSERS}
            placeholder="Type a note… use @ to insert variables when available"
            minHeight="100px"
          />

          {/* Move to date — only for existing notes */}
          {!isNew && (
            <div className="flex items-center gap-3 pt-1 border-t border-border">
              <Label className="text-sm text-muted-foreground shrink-0">Move to date</Label>
              <DatePicker
                value={moveToDate}
                onChange={setMoveToDate}
                placeholder={`Keep on ${formattedDate}`}
                size="default"
              />
              {moveToDate && (
                <button
                  onClick={() => setMoveToDate("")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Visibility checkboxes — only for employee notes */}
          {!isDayNote && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showOnCoverSheet"
                  checked={showOnCoverSheet}
                  onCheckedChange={(checked) =>
                    setShowOnCoverSheet(checked === true)
                  }
                />
                <Label htmlFor="showOnCoverSheet" className="text-sm cursor-pointer">
                  Print on cover sheet
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showInCrewLeadSummary"
                  checked={showInCrewLeadSummary}
                  onCheckedChange={(checked) =>
                    setShowInCrewLeadSummary(checked === true)
                  }
                />
                <Label htmlFor="showInCrewLeadSummary" className="text-sm cursor-pointer">
                  Include in crew lead summary
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {!isNew && (
            <Button
              variant="destructive"
              intensity="soft"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" intensity="ghost" onClick={onCloseAction}>
            Cancel
          </Button>
          <Button
            variant="primary"
            intensity="solid"
            onClick={handleSave}
            disabled={!noteHtml.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
