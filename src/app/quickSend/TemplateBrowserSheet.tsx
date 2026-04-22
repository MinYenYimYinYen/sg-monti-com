"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/style/components/sheet";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Badge } from "@/style/components/badge";
import { authSelect } from "@/app/auth/authSlice";
import { quickSendActions } from "./quickSendSlice";
import { storedTemplatesSelect } from "./storedTemplates/storedTemplatesSelect";
import { StoredTemplateDoc } from "./storedTemplates/StoredTemplateTypes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TemplateBrowserSheet({ open, onOpenChange }: Props) {
  const dispatch = useAppDispatch();
  const currentUser = useSelector(authSelect.user);
  const templates = useSelector(storedTemplatesSelect.templates);
  const groups = useSelector(storedTemplatesSelect.groups);
  const groupMap = useSelector(storedTemplatesSelect.groupMap);

  const currentUserName = currentUser?.userName ?? null;

  // ── Filter state (local — resets on close via key) ───────────────────────
  const [search, setSearch] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [mineOnly, setMineOnly] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    // Reset filters when closing
    setSearch("");
    setSelectedGroupIds(new Set());
    setMineOnly(false);
  };

  const handleLoad = (template: StoredTemplateDoc) => {
    dispatch(quickSendActions.loadTemplate(template));
    handleClose();
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = templates.filter((t) => {
    if (mineOnly && t.userName !== currentUserName) return false;
    if (selectedGroupIds.size > 0 && !selectedGroupIds.has(t.groupId)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.userName.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Own templates first, then alphabetically by name
  const sorted = [...filtered].sort((a, b) => {
    const aOwn = a.userName === currentUserName ? 0 : 1;
    const bOwn = b.userName === currentUserName ? 0 : 1;
    if (aOwn !== bOwn) return aOwn - bOwn;
    return a.name.localeCompare(b.name);
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex flex-col p-0 sm:max-w-2xl w-full"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>Open Template</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: filters ── */}
          <div className="w-52 shrink-0 border-r border-border flex flex-col gap-4 p-4 overflow-y-auto">
            {/* Search */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or owner…"
                  className="h-8 pl-7 text-sm"
                />
              </div>
            </div>

            {/* Owner filter */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Owner</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(e) => setMineOnly(e.target.checked)}
                  className="rounded border-input"
                />
                Mine only
              </label>
            </div>

            {/* Group filter */}
            {groups.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Groups</Label>
                <div className="flex flex-col gap-1">
                  {groups.map((group) => (
                    <label
                      key={group.groupId}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.has(group.groupId)}
                        onChange={() => toggleGroup(group.groupId)}
                        className="rounded border-input"
                      />
                      {group.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: template list ── */}
          <div className="flex-1 overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-6 text-center">
                {templates.length === 0
                  ? "No templates saved yet."
                  : "No templates match your filters."}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {sorted.map((template) => {
                  const group = groupMap.get(template.groupId);
                  const isOwn = template.userName === currentUserName;
                  return (
                    <li key={template.templateId}>
                      <button
                        onClick={() => handleLoad(template)}
                        className="w-full text-left px-5 py-3 hover:bg-accent/10 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {template.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isOwn ? "You" : template.userName}
                            {group ? ` · ${group.name}` : ""}
                          </span>
                        </div>
                        {group && (
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px] px-1.5 py-0"
                          >
                            {group.name}
                          </Badge>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
