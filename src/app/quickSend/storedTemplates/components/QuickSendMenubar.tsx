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
import {
  TooltipProvider,
} from "@/style/components/tooltip";
import { authSelect } from "@/app/auth/authSlice";
import { quickSendActions } from "../../quickSendSlice";
import { quickSendSelect } from "../../quickSendSelect";
import { storedTemplatesSelect } from "../storedTemplatesSelect";
import { useStoredTemplates } from "../useStoredTemplates";
import { StoredTemplateDoc } from "../StoredTemplateTypes";
import { TemplateBrowserSheet } from "./TemplateBrowserSheet";
import { SaveAsDialog } from "./SaveAsDialog";
import { RenameTemplateDialog } from "./RenameTemplateDialog";
import { DeleteTemplateDialog } from "./DeleteTemplateDialog";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { RenameGroupDialog } from "./RenameGroupDialog";
import { DeleteGroupDialog, TemplateResolution } from "./DeleteGroupDialog";

export function QuickSendMenubar() {
  const dispatch = useAppDispatch();
  const storedTemplates = useStoredTemplates();

  const currentUser = useSelector(authSelect.user);
  const role = useSelector(authSelect.role);
  const sections = useSelector(quickSendSelect.sections);
  const programConfigs = useSelector(quickSendSelect.programConfigs);
  const loadedTemplateId = useSelector(quickSendSelect.loadedTemplateId);
  const loadedTemplateSaId = useSelector(quickSendSelect.loadedTemplateSaId);
  const loadedTemplateName = useSelector(quickSendSelect.loadedTemplateName);
  const loadedTemplateGroupId = useSelector(quickSendSelect.loadedTemplateGroupId);
  const groups = useSelector(storedTemplatesSelect.groups);
  const templatesByGroup = useSelector(storedTemplatesSelect.templatesByGroup);

  const currentUserSaId = currentUser?.saId ?? null;
  const isAdmin = role === "admin";
  const isOwner = !!currentUserSaId && currentUserSaId === loadedTemplateSaId;

  // ── Dialog / Sheet open states ───────────────────────────────────────────
  const [browserOpen, setBrowserOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [renameGroupOpen, setRenameGroupOpen] = useState(false);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);

  // ── Group selection state for rename/delete ──────────────────────────────
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  // ── Handlers — Template ──────────────────────────────────────────────────

  const handleNew = () => dispatch(quickSendActions.clearTemplate());

  const handleSave = () => {
    if (!loadedTemplateId || !loadedTemplateName || !loadedTemplateGroupId || !currentUserSaId) return;
    storedTemplates.saveTemplate({
      templateId: loadedTemplateId,
      name: loadedTemplateName,
      groupId: loadedTemplateGroupId,
      saId: currentUserSaId,
      sections,
      programConfigs,
    });
  };

  const handleSaveAs = (name: string, groupId: string) => {
    if (!currentUserSaId) return;
    storedTemplates.saveTemplate({
      templateId: "",
      name,
      groupId,
      saId: currentUserSaId,
      sections,
      programConfigs,
    }).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        dispatch(quickSendActions.loadTemplate(result.payload as StoredTemplateDoc));
      }
    });
  };

  const handleRename = (newName: string) => {
    if (!loadedTemplateId || !loadedTemplateGroupId || !currentUserSaId) return;
    storedTemplates.saveTemplate({
      templateId: loadedTemplateId,
      name: newName,
      groupId: loadedTemplateGroupId,
      saId: currentUserSaId,
      sections,
      programConfigs,
    }).then((result) => {
      if (result.meta.requestStatus === "fulfilled") {
        dispatch(quickSendActions.loadTemplate(result.payload as StoredTemplateDoc));
      }
    });
  };

  const handleDelete = () => {
    if (!loadedTemplateId) return;
    storedTemplates.deleteTemplate(loadedTemplateId);
    dispatch(quickSendActions.clearTemplate());
  };

  // ── Handlers — Groups ────────────────────────────────────────────────────

  const handleCreateGroup = (name: string) => {
    storedTemplates.createGroup(name);
  };

  const handleRenameGroup = (newName: string) => {
    if (!renameGroupId) return;
    storedTemplates.renameGroup(renameGroupId, newName);
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

              <MenubarItem disabled={!loadedTemplateId || !currentUserSaId} onSelect={handleSave}>
                Save
              </MenubarItem>

              <MenubarItem onSelect={(e) => { e.preventDefault(); setSaveAsOpen(true); }}>
                Save As…
              </MenubarItem>

              <MenubarSeparator />

              <MenubarItem
                disabled={!isOwner}
                onSelect={(e) => { e.preventDefault(); setRenameOpen(true); }}
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
              <MenubarItem onSelect={(e) => { e.preventDefault(); setCreateGroupOpen(true); }}>
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
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        {loadedTemplateId && (
          <span className="ml-auto text-xs text-muted-foreground truncate max-w-48">
            {loadedTemplateName}-{loadedTemplateSaId}
          </span>
        )}
      </div>

      {/* ── Portaled dialogs / sheets (outside menubar to avoid dismissal conflicts) ── */}

      <TemplateBrowserSheet open={browserOpen} onOpenChangeAction={setBrowserOpen} />

      <SaveAsDialog
        open={saveAsOpen}
        onOpenChange={setSaveAsOpen}
        groups={groups}
        onSave={handleSaveAs}
      />

      <RenameTemplateDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialName={loadedTemplateName ?? ""}
        onRename={handleRename}
      />

      <DeleteTemplateDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        templateName={loadedTemplateName}
        onDelete={handleDelete}
      />

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onCreate={handleCreateGroup}
      />

      <RenameGroupDialog
        open={renameGroupOpen}
        onOpenChange={setRenameGroupOpen}
        initialName={renameGroupName}
        onRename={handleRenameGroup}
      />

      {deleteGroup && (
        <DeleteGroupDialog
          open={deleteGroupOpen}
          onOpenChange={setDeleteGroupOpen}
          group={deleteGroup}
          templatesInGroup={deleteGroupTemplates}
          otherGroups={otherGroups}
          currentUserSaId={currentUserSaId}
          onConfirm={handleDeleteGroupConfirm}
        />
      )}
    </TooltipProvider>
  );
}
