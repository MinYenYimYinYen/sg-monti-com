"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Lock, Unlock } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/style/components/dialog";
import { Input } from "@/style/components/input";
import { Button } from "@/style/components/button";
import { Label } from "@/style/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/style/components/tooltip";
import { authSelect } from "@/app/auth/authSlice";
import { quickSendActions } from "./quickSendSlice";
import { quickSendSelect } from "./quickSendSelect";
import { storedTemplatesSelect } from "./storedTemplates/storedTemplatesSelect";
import { useStoredTemplates } from "./storedTemplates/useStoredTemplates";
import { StoredTemplateDoc, TemplateGroupDoc } from "./storedTemplates/StoredTemplateTypes";
import { TemplateBrowserSheet } from "./TemplateBrowserSheet";

// ---------------------------------------------------------------------------
// Delete Group resolution dialog
// ---------------------------------------------------------------------------

type TemplateResolution =
  | { type: "move"; groupId: string }
  | { type: "delete" }
  | { type: "newGroup"; name: string }
  | null;

type DeleteGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: TemplateGroupDoc;
  templatesInGroup: StoredTemplateDoc[];
  otherGroups: TemplateGroupDoc[];
  currentUserName: string | null;
  onConfirm: (groupId: string, resolutions: Map<string, TemplateResolution>) => void;
};

function DeleteGroupDialog({
  open,
  onOpenChange,
  group,
  templatesInGroup,
  otherGroups,
  currentUserName,
  onConfirm,
}: DeleteGroupDialogProps) {
  const [resolutions, setResolutions] = useState<Map<string, TemplateResolution>>(new Map());
  const [newGroupNames, setNewGroupNames] = useState<Map<string, string>>(new Map());

  const setResolution = (templateId: string, resolution: TemplateResolution) => {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(templateId, resolution);
      return next;
    });
  };

  const setNewGroupName = (templateId: string, name: string) => {
    setNewGroupNames((prev) => {
      const next = new Map(prev);
      next.set(templateId, name);
      return next;
    });
    setResolution(templateId, { type: "newGroup", name });
  };

  const allResolved =
    templatesInGroup.length === 0 ||
    templatesInGroup.every((t) => {
      const r = resolutions.get(t.templateId);
      if (!r) return false;
      if (r.type === "newGroup") return !!r.name.trim();
      return true;
    });

  const handleConfirm = () => {
    onConfirm(group.groupId, resolutions);
    onOpenChange(false);
    setResolutions(new Map());
    setNewGroupNames(new Map());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Group: {group.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {templatesInGroup.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This group is empty. It will be deleted immediately.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Resolve each template before deleting the group:
              </p>
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                {templatesInGroup.map((template) => {
                  const isOwn = template.userName === currentUserName;
                  const resolution = resolutions.get(template.templateId) ?? null;
                  const newGroupName = newGroupNames.get(template.templateId) ?? "";

                  return (
                    <div key={template.templateId} className="flex flex-col gap-1 border border-border rounded p-2">
                      <p className="text-xs font-medium truncate">{template.name}</p>
                      <p className="text-[10px] text-muted-foreground">{template.userName}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        {otherGroups.length > 0 && (
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="radio"
                              name={`res-${template.templateId}`}
                              checked={resolution?.type === "move"}
                              onChange={() =>
                                setResolution(template.templateId, {
                                  type: "move",
                                  groupId: otherGroups[0].groupId,
                                })
                              }
                            />
                            Move to:
                            <select
                              className="flex-1 h-6 rounded border border-input bg-card px-1 text-xs"
                              value={resolution?.type === "move" ? resolution.groupId : otherGroups[0].groupId}
                              onChange={(e) =>
                                setResolution(template.templateId, {
                                  type: "move",
                                  groupId: e.target.value,
                                })
                              }
                              onClick={() => {
                                if (resolution?.type !== "move") {
                                  setResolution(template.templateId, {
                                    type: "move",
                                    groupId: otherGroups[0].groupId,
                                  });
                                }
                              }}
                            >
                              {otherGroups.map((g) => (
                                <option key={g.groupId} value={g.groupId}>{g.name}</option>
                              ))}
                            </select>
                          </label>
                        )}
                        {isOwn && (
                          <label className="flex items-center gap-2 text-xs cursor-pointer text-destructive">
                            <input
                              type="radio"
                              name={`res-${template.templateId}`}
                              checked={resolution?.type === "delete"}
                              onChange={() => setResolution(template.templateId, { type: "delete" })}
                            />
                            Delete this template
                          </label>
                        )}
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name={`res-${template.templateId}`}
                            checked={resolution?.type === "newGroup"}
                            onChange={() =>
                              setResolution(template.templateId, { type: "newGroup", name: newGroupName })
                            }
                          />
                          New group:
                          <Input
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(template.templateId, e.target.value)}
                            placeholder="Group name…"
                            className="flex-1 h-6 text-xs px-1"
                            onClick={() => {
                              if (resolution?.type !== "newGroup") {
                                setResolution(template.templateId, { type: "newGroup", name: newGroupName });
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="accent" intensity="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              intensity="solid"
              onClick={handleConfirm}
              disabled={!allResolved}
            >
              Delete Group
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main menubar
// ---------------------------------------------------------------------------

export function QuickSendMenubar() {
  const dispatch = useAppDispatch();
  const storedTemplates = useStoredTemplates();

  const currentUser = useSelector(authSelect.user);
  const role = useSelector(authSelect.role);
  const sections = useSelector(quickSendSelect.sections);
  const programConfigs = useSelector(quickSendSelect.programConfigs);
  const loadedTemplateId = useSelector(quickSendSelect.loadedTemplateId);
  const loadedTemplateOwner = useSelector(quickSendSelect.loadedTemplateOwner);
  const loadedTemplateName = useSelector(quickSendSelect.loadedTemplateName);
  const loadedTemplateGroupId = useSelector(quickSendSelect.loadedTemplateGroupId);
  const isLocked = useSelector(quickSendSelect.isLocked);
  const groups = useSelector(storedTemplatesSelect.groups);
  const templatesByGroup = useSelector(storedTemplatesSelect.templatesByGroup);

  const currentUserName = currentUser?.userName ?? null;
  const isAdmin = role === "admin";
  const isOwner = !!currentUserName && currentUserName === loadedTemplateOwner;

  // ── Dialog / Sheet open states ───────────────────────────────────────────
  const [browserOpen, setBrowserOpen] = useState(false);

  // Template dialogs
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Group dialogs
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [renameGroupOpen, setRenameGroupOpen] = useState(false);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);

  // ── Form state ───────────────────────────────────────────────────────────
  const [saveAsName, setSaveAsName] = useState("");
  const [saveAsGroupId, setSaveAsGroupId] = useState(groups[0]?.groupId ?? "");
  const [renameName, setRenameName] = useState("");
  const [createGroupName, setCreateGroupName] = useState("");
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  // ── Handlers — Template ──────────────────────────────────────────────────

  const handleNew = () => dispatch(quickSendActions.clearTemplate());

  const handleSave = () => {
    if (!loadedTemplateId || !loadedTemplateName || !loadedTemplateGroupId || !currentUserName) return;
    storedTemplates.saveTemplate({
      templateId: loadedTemplateId,
      name: loadedTemplateName,
      groupId: loadedTemplateGroupId,
      userName: currentUserName,
      sections,
      programConfigs,
    });
  };

  const handleSaveAs = () => {
    if (!saveAsName.trim() || !currentUserName) return;
    const groupId = saveAsGroupId || groups[0]?.groupId || "ungrouped";
    storedTemplates.saveTemplate({
      templateId: "",
      name: saveAsName.trim(),
      groupId,
      userName: currentUserName,
      sections,
      programConfigs,
    }).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        dispatch(quickSendActions.loadTemplate(result.payload as StoredTemplateDoc));
      }
    });
    setSaveAsName("");
    setSaveAsOpen(false);
  };

  const handleRename = () => {
    if (!renameName.trim() || !loadedTemplateId || !loadedTemplateGroupId || !currentUserName) return;
    storedTemplates.saveTemplate({
      templateId: loadedTemplateId,
      name: renameName.trim(),
      groupId: loadedTemplateGroupId,
      userName: currentUserName,
      sections,
      programConfigs,
    }).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        dispatch(quickSendActions.loadTemplate(result.payload as StoredTemplateDoc));
      }
    });
    setRenameOpen(false);
  };

  const handleDelete = () => {
    if (!loadedTemplateId) return;
    storedTemplates.deleteTemplate(loadedTemplateId);
    dispatch(quickSendActions.clearTemplate());
    setDeleteOpen(false);
  };

  const handleUnlock = () => dispatch(quickSendActions.unlock());

  // ── Handlers — Groups ────────────────────────────────────────────────────

  const handleCreateGroup = () => {
    if (!createGroupName.trim()) return;
    storedTemplates.createGroup(createGroupName.trim());
    setCreateGroupName("");
    setCreateGroupOpen(false);
  };

  const handleRenameGroup = () => {
    if (!renameGroupId || !renameGroupName.trim()) return;
    storedTemplates.renameGroup(renameGroupId, renameGroupName.trim());
    setRenameGroupOpen(false);
    setRenameGroupId(null);
    setRenameGroupName("");
  };

  const handleDeleteGroupConfirm = async (
    groupId: string,
    resolutions: Map<string, TemplateResolution>,
  ) => {
    const newGroupCache = new Map<string, string>();

    for (const [templateId, resolution] of resolutions) {
      if (!resolution) continue;

      if (resolution.type === "delete") {
        await storedTemplates.deleteTemplate(templateId);
      } else if (resolution.type === "move") {
        await storedTemplates.moveTemplate(templateId, resolution.groupId);
      } else if (resolution.type === "newGroup") {
        const name = resolution.name.trim();
        let targetGroupId = newGroupCache.get(name);
        if (!targetGroupId) {
          const result = await storedTemplates.createGroup(name);
          if (result.meta.requestStatus === "fulfilled") {
            targetGroupId = (result.payload as { groupId: string }).groupId;
            newGroupCache.set(name, targetGroupId);
          }
        }
        if (targetGroupId) {
          await storedTemplates.moveTemplate(templateId, targetGroupId);
        }
      }
    }

    storedTemplates.deleteGroup(groupId);
  };

  // ── Derived data ─────────────────────────────────────────────────────────

  const deleteGroup = deleteGroupId ? groups.find((g) => g.groupId === deleteGroupId) : null;
  const deleteGroupTemplates = deleteGroupId ? (templatesByGroup.get(deleteGroupId) ?? []) : [];
  const otherGroups = deleteGroupId ? groups.filter((g) => g.groupId !== deleteGroupId) : groups;

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
              <MenubarItem onSelect={(e) => { e.preventDefault(); setBrowserOpen(true); }}>
                Open…
              </MenubarItem>
              <MenubarSeparator />

              {isLocked ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MenubarItem disabled>Save</MenubarItem>
                  </TooltipTrigger>
                  <TooltipContent side="right">Owned by {loadedTemplateOwner}</TooltipContent>
                </Tooltip>
              ) : (
                <MenubarItem disabled={!loadedTemplateId} onSelect={handleSave}>
                  Save
                </MenubarItem>
              )}

              <MenubarItem onSelect={(e) => { e.preventDefault(); setSaveAsGroupId(groups[0]?.groupId ?? ""); setSaveAsOpen(true); }}>
                Save As…
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem
                disabled={!isOwner}
                onSelect={(e) => { e.preventDefault(); setRenameName(loadedTemplateName ?? ""); setRenameOpen(true); }}
              >
                Rename…
              </MenubarItem>

              <MenubarItem
                disabled={!isOwner}
                className="text-destructive focus:text-destructive"
                onSelect={(e) => { e.preventDefault(); setDeleteOpen(true); }}
              >
                Delete…
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* ── Groups menu ── */}
          <MenubarMenu>
            <MenubarTrigger className="text-sm">Groups</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={(e) => { e.preventDefault(); setCreateGroupName(""); setCreateGroupOpen(true); }}>
                Create New Group…
              </MenubarItem>

              {groups.length > 0 && (
                <MenubarSub>
                  <MenubarSubTrigger disabled={!isAdmin}>Rename Group</MenubarSubTrigger>
                  <MenubarSubContent>
                    {groups.map((group) => (
                      <MenubarItem
                        key={group.groupId}
                        onSelect={(e) => {
                          e.preventDefault();
                          setRenameGroupId(group.groupId);
                          setRenameGroupName(group.name);
                          setRenameGroupOpen(true);
                        }}
                      >
                        {group.name}
                      </MenubarItem>
                    ))}
                  </MenubarSubContent>
                </MenubarSub>
              )}

              {groups.length > 0 && (
                <MenubarSub>
                  <MenubarSubTrigger disabled={!isAdmin}>Delete Group</MenubarSubTrigger>
                  <MenubarSubContent>
                    {groups.map((group) => (
                      <MenubarItem
                        key={group.groupId}
                        className="text-destructive focus:text-destructive"
                        onSelect={(e) => {
                          e.preventDefault();
                          setDeleteGroupId(group.groupId);
                          setDeleteGroupOpen(true);
                        }}
                      >
                        {group.name}
                      </MenubarItem>
                    ))}
                  </MenubarSubContent>
                </MenubarSub>
              )}

              {groups.length > 0 && <MenubarSeparator />}

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
                            onSelect={() => dispatch(quickSendActions.loadTemplate(template))}
                          >
                            <div className="flex flex-col">
                              <span>{template.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {template.userName === currentUserName ? "You" : template.userName}
                              </span>
                            </div>
                          </MenubarItem>
                        ))
                      )}
                    </MenubarSubContent>
                  </MenubarSub>
                );
              })}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        {/* Lock indicator */}
        {loadedTemplateId && (
          <div className="ml-auto flex items-center gap-1.5">
            {isLocked ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleUnlock}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Lock className="h-3 w-3" />
                    <span>Owned by {loadedTemplateOwner}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to unlock and allow saving</TooltipContent>
              </Tooltip>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Unlock className="h-3 w-3" />
                <span>{loadedTemplateName}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Portaled dialogs / sheets (outside menubar to avoid dismissal conflicts) ── */}

      <TemplateBrowserSheet open={browserOpen} onOpenChange={setBrowserOpen} />

      {/* Save As */}
      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save As New Template</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="Template name…"
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveAs(); }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Group</Label>
              <select
                value={saveAsGroupId}
                onChange={(e) => setSaveAsGroupId(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
              >
                {groups.length === 0 ? (
                  <option value="" disabled>No groups yet</option>
                ) : (
                  groups.map((g) => (
                    <option key={g.groupId} value={g.groupId}>{g.name}</option>
                  ))
                )}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="accent" intensity="ghost" onClick={() => setSaveAsOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" intensity="solid" onClick={handleSaveAs} disabled={!saveAsName.trim()}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Template */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Template</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">New Name</Label>
              <Input
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                placeholder="New name…"
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="accent" intensity="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" intensity="solid" onClick={handleRename} disabled={!renameName.trim()}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Template */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Template</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-medium text-foreground">{loadedTemplateName}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="accent" intensity="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button size="sm" variant="destructive" intensity="solid" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group */}
      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create New Group</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Group Name</Label>
              <Input
                value={createGroupName}
                onChange={(e) => setCreateGroupName(e.target.value)}
                placeholder="Group name…"
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateGroup(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="accent" intensity="ghost" onClick={() => setCreateGroupOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" intensity="solid" onClick={handleCreateGroup} disabled={!createGroupName.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Group */}
      <Dialog open={renameGroupOpen} onOpenChange={setRenameGroupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename Group</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">New Name</Label>
              <Input
                value={renameGroupName}
                onChange={(e) => setRenameGroupName(e.target.value)}
                placeholder="New name…"
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleRenameGroup(); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="accent" intensity="ghost" onClick={() => setRenameGroupOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" intensity="solid" onClick={handleRenameGroup} disabled={!renameGroupName.trim()}>Rename</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group */}
      {deleteGroup && (
        <DeleteGroupDialog
          open={deleteGroupOpen}
          onOpenChange={setDeleteGroupOpen}
          group={deleteGroup}
          templatesInGroup={deleteGroupTemplates}
          otherGroups={otherGroups}
          currentUserName={currentUserName}
          onConfirm={handleDeleteGroupConfirm}
        />
      )}
    </TooltipProvider>
  );
}
