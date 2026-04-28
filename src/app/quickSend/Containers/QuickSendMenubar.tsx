"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/style/components/menubar";
import { TooltipProvider } from "@/style/components/tooltip";
import { authSelect } from "@/app/auth/authSlice";
import { quickSendActions } from "../quickSendSlice";
import { qsSelect } from "../quickSendSelect";
import { storedTemplatesSelect } from "../storedTemplates/storedTemplatesSelect";
import { useStoredTemplates } from "../storedTemplates/useStoredTemplates";
import type { StoredTemplateDoc } from "../storedTemplates/StoredTemplateTypes";

// ── Inline dialogs ────────────────────────────────────────────────────────────

type SaveAsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: { groupId: string; name: string }[];
  onSave: (name: string, groupId: string | null) => void;
};

function SaveAsDialog({ open, onOpenChange, groups, onSave }: SaveAsDialogProps) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>("");

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), groupId || null);
    setName("");
    setGroupId("");
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Save Template As</h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Name</label>
          <input
            autoFocus
            className="rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Group (optional)</label>
          <select
            className="rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">No group</option>
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className="text-xs bg-primary text-primary-foreground rounded px-3 py-1.5 hover:bg-primary/90 disabled:opacity-50"
            disabled={!name.trim()}
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

type NameDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
};

function NameDialog({
  open,
  onOpenChange,
  title,
  label,
  initialValue = "",
  confirmLabel = "OK",
  onConfirm,
}: NameDialogProps) {
  const [value, setValue] = useState(initialValue);

  if (!open) return null;

  const handleConfirm = () => {
    if (!value.trim()) return;
    onConfirm(value.trim());
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">{label}</label>
          <input
            autoFocus
            className="rounded border border-border bg-card px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className="text-xs bg-primary text-primary-foreground rounded px-3 py-1.5 hover:bg-primary/90 disabled:opacity-50"
            disabled={!value.trim()}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "destructive" | "primary";
  onConfirm: () => void;
};

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;
  const btnClass =
    confirmVariant === "primary"
      ? "text-xs bg-primary text-primary-foreground rounded px-3 py-1.5 hover:bg-primary/90"
      : "text-xs bg-destructive text-destructive-foreground rounded px-3 py-1.5 hover:bg-destructive/90";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-lg shadow-xl p-6 w-80 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className={btnClass}
            onClick={() => { onConfirm(); onOpenChange(false); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function QuickSendMenubar() {
  const dispatch = useAppDispatch();
  const storedTemplates = useStoredTemplates();

  const currentUser = useSelector(authSelect.user);
  const role = useSelector(authSelect.role);
  const sections = useSelector(qsSelect.sections);
  const programConfigs = useSelector(qsSelect.programConfigs);
  const globalPrepayId = useSelector(qsSelect.effectiveGlobalPrepayId);
  const loadedTemplateId = useSelector(qsSelect.loadedTemplateId);
  const loadedTemplateSaId = useSelector(qsSelect.loadedTemplateSaId);
  const loadedTemplateName = useSelector(qsSelect.loadedTemplateName);
  const loadedTemplateGroupId = useSelector(qsSelect.loadedTemplateGroupId);
  const groups = useSelector(storedTemplatesSelect.groups);
  const templatesByGroup = useSelector(storedTemplatesSelect.templatesByGroup);
  const ungroupedTemplates = useSelector(storedTemplatesSelect.templates).filter(
    (t) => t.groupId === null,
  );

  const currentUserSaId = currentUser?.saId ?? null;
  const isAdmin = role === "admin";
  const isOwner = !!currentUserSaId && currentUserSaId === loadedTemplateSaId;
  const isOtherUsersTemplate =
    !!loadedTemplateSaId && !!currentUserSaId && loadedTemplateSaId !== currentUserSaId;

  // ── Dialog open states ────────────────────────────────────────────────────
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveOtherUserOpen, setSaveOtherUserOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [renameGroupOpen, setRenameGroupOpen] = useState(false);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [renameGroupCurrentName, setRenameGroupCurrentName] = useState("");
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteGroupName, setDeleteGroupName] = useState("");

  // ── Handlers — Template ───────────────────────────────────────────────────

  const handleNew = () => dispatch(quickSendActions.clearTemplate());

  const executeSave = () => {
    if (!loadedTemplateName || !currentUserSaId) return;
    storedTemplates.saveTemplate({
      templateId: loadedTemplateId ?? "",
      name: loadedTemplateName,
      groupId: loadedTemplateGroupId ?? null,
      saId: currentUserSaId,
      sections,
      programConfigs,
      globalPrepayId: globalPrepayId ?? null,
    });
  };

  const handleSave = () => {
    if (!loadedTemplateName || !currentUserSaId) return;
    // Warn if saving a template that belongs to another user — it will create/overwrite
    // the current user's own template with the same name, not the coworker's.
    if (isOtherUsersTemplate) {
      setSaveOtherUserOpen(true);
      return;
    }
    executeSave();
  };

  const handleSaveAs = (name: string, groupId: string | null) => {
    if (!currentUserSaId) return;
    storedTemplates.saveTemplate({
      templateId: "",
      name,
      groupId,
      saId: currentUserSaId,
      sections,
      programConfigs,
      globalPrepayId: globalPrepayId ?? null,
    }).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        const saved = result.payload as StoredTemplateDoc;
        dispatch(quickSendActions.loadTemplate(saved));
      }
    });
  };

  const handleDelete = () => {
    if (!loadedTemplateId) return;
    storedTemplates.deleteTemplate(loadedTemplateId);
    dispatch(quickSendActions.clearTemplate());
  };

  const handleMoveToGroup = (groupId: string | null) => {
    if (!loadedTemplateId) return;
    storedTemplates.moveTemplate(loadedTemplateId, groupId);
  };

  const handleLoadTemplate = (template: StoredTemplateDoc) => {
    dispatch(quickSendActions.loadTemplate(template));
  };

  // ── Handlers — Groups ─────────────────────────────────────────────────────

  const handleCreateGroup = (name: string) => {
    storedTemplates.createGroup(name);
  };

  const handleRenameGroup = (newName: string) => {
    if (!renameGroupId) return;
    storedTemplates.renameGroup(renameGroupId, newName);
    setRenameGroupId(null);
  };

  const handleDeleteGroup = () => {
    if (!deleteGroupId) return;
    storedTemplates.deleteGroup(deleteGroupId);
    setDeleteGroupId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 border-b border-border bg-background px-2 py-1 shrink-0">
        <Menubar className="border-0 shadow-none bg-transparent p-0 h-auto">

          {/* ── Template menu ── */}
          <MenubarMenu>
            <MenubarTrigger className="text-sm">Template</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={handleNew}>New</MenubarItem>
              <MenubarSeparator />

              <MenubarItem
                disabled={!loadedTemplateName || !currentUserSaId}
                onSelect={(e) => { e.preventDefault(); handleSave(); }}
              >
                Save
              </MenubarItem>

              <MenubarItem onSelect={(e) => { e.preventDefault(); setSaveAsOpen(true); }}>
                Save As…
              </MenubarItem>

              {/* Move to Group — only when a template is loaded and user is owner/admin */}
              {loadedTemplateId && (isOwner || isAdmin) && (
                <MenubarSub>
                  <MenubarSubTrigger>Move to Group</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem
                      onSelect={() => handleMoveToGroup(null)}
                      disabled={loadedTemplateGroupId === null}
                    >
                      No group
                    </MenubarItem>
                    {groups.map((group) => (
                      <MenubarItem
                        key={group.groupId}
                        onSelect={() => handleMoveToGroup(group.groupId)}
                        disabled={loadedTemplateGroupId === group.groupId}
                      >
                        {group.name}
                      </MenubarItem>
                    ))}
                  </MenubarSubContent>
                </MenubarSub>
              )}

              <MenubarSeparator />

              <MenubarItem
                disabled={!isOwner && !isAdmin}
                className="text-destructive focus:text-destructive"
                onSelect={(e) => { e.preventDefault(); setDeleteOpen(true); }}
              >
                Delete…
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* ── Open menu — browse by group ── */}
          <MenubarMenu>
            <MenubarTrigger className="text-sm">Open</MenubarTrigger>
            <MenubarContent>
              {ungroupedTemplates.length > 0 && (
                <>
                  {ungroupedTemplates.map((template) => (
                    <MenubarItem
                      key={template.templateId}
                      onSelect={() => handleLoadTemplate(template)}
                    >
                      <div className="flex flex-col">
                        <span>{template.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {template.saId === currentUserSaId ? "You" : template.saId}
                        </span>
                      </div>
                    </MenubarItem>
                  ))}
                  {groups.length > 0 && <MenubarSeparator />}
                </>
              )}

              {groups.map((group) => {
                const groupTemplates = templatesByGroup.get(group.groupId) ?? [];
                return (
                  <MenubarSub key={group.groupId}>
                    <MenubarSubTrigger>{group.name}</MenubarSubTrigger>
                    <MenubarSubContent>
                      {groupTemplates.length === 0 ? (
                        <MenubarItem disabled>No templates</MenubarItem>
                      ) : (
                        groupTemplates.map((template) => (
                          <MenubarItem
                            key={template.templateId}
                            onSelect={() => handleLoadTemplate(template)}
                          >
                            <div className="flex flex-col">
                              <span>{template.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {template.saId === currentUserSaId ? "You" : template.saId}
                              </span>
                            </div>
                          </MenubarItem>
                        ))
                      )}
                    </MenubarSubContent>
                  </MenubarSub>
                );
              })}

              {ungroupedTemplates.length === 0 && groups.length === 0 && (
                <MenubarItem disabled>No templates saved</MenubarItem>
              )}
            </MenubarContent>
          </MenubarMenu>

          {/* ── Groups menu ── */}
          <MenubarMenu>
            <MenubarTrigger className="text-sm">Groups</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={(e) => { e.preventDefault(); setCreateGroupOpen(true); }}>
                Create New Group…
              </MenubarItem>

              {groups.length > 0 && isAdmin && (
                <MenubarSub>
                  <MenubarSubTrigger>Rename Group</MenubarSubTrigger>
                  <MenubarSubContent>
                    {groups.map((group) => (
                      <MenubarItem
                        key={group.groupId}
                        onSelect={(e) => {
                          e.preventDefault();
                          setRenameGroupId(group.groupId);
                          setRenameGroupCurrentName(group.name);
                          setRenameGroupOpen(true);
                        }}
                      >
                        {group.name}
                      </MenubarItem>
                    ))}
                  </MenubarSubContent>
                </MenubarSub>
              )}

              {groups.length > 0 && isAdmin && (
                <MenubarSub>
                  <MenubarSubTrigger className="text-destructive focus:text-destructive">
                    Delete Group
                  </MenubarSubTrigger>
                  <MenubarSubContent>
                    {groups.map((group) => (
                      <MenubarItem
                        key={group.groupId}
                        className="text-destructive focus:text-destructive"
                        onSelect={(e) => {
                          e.preventDefault();
                          setDeleteGroupId(group.groupId);
                          setDeleteGroupName(group.name);
                          setDeleteGroupOpen(true);
                        }}
                      >
                        {group.name}
                      </MenubarItem>
                    ))}
                  </MenubarSubContent>
                </MenubarSub>
              )}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        {loadedTemplateId && (
          <span className="ml-auto text-xs text-muted-foreground truncate max-w-48">
            {loadedTemplateName} — {loadedTemplateSaId}
          </span>
        )}
      </div>

      {/* ── Dialogs ── */}

      <SaveAsDialog
        open={saveAsOpen}
        onOpenChange={setSaveAsOpen}
        groups={groups}
        onSave={handleSaveAs}
      />

      {/* Save confirmation when opening another user's template */}
      <ConfirmDialog
        open={saveOtherUserOpen}
        onOpenChange={setSaveOtherUserOpen}
        title="Save as your own template?"
        message={`You opened ${loadedTemplateSaId}'s template. Saving will create or overwrite your own template named "${loadedTemplateName}". Their template will not be affected.`}
        confirmLabel="Save"
        confirmVariant="primary"
        onConfirm={executeSave}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Template"
        message={`Delete "${loadedTemplateName}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />

      <NameDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        title="Create New Group"
        label="Group name"
        confirmLabel="Create"
        onConfirm={handleCreateGroup}
      />

      <NameDialog
        open={renameGroupOpen}
        onOpenChange={setRenameGroupOpen}
        title="Rename Group"
        label="New name"
        initialValue={renameGroupCurrentName}
        confirmLabel="Rename"
        onConfirm={handleRenameGroup}
      />

      <ConfirmDialog
        open={deleteGroupOpen}
        onOpenChange={setDeleteGroupOpen}
        title="Delete Group"
        message={`Delete group "${deleteGroupName}"? The group must be empty. Templates in this group will not be deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteGroup}
      />
    </TooltipProvider>
  );
}
