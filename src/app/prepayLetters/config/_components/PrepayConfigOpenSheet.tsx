"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { prepayConfigSelect } from "../prepayConfigSelect";
import { prepayConfigActions } from "../prepayConfigSlice";
import { authSelect } from "@/app/auth/authSlice";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/style/components/sheet";
import { Input } from "@/style/components/input";
import { Badge } from "@/style/components/badge";
import { ScrollArea } from "@/style/components/scroll-area";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PrepayConfigOpenSheet({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const configsWithDisplayName = useSelector(prepayConfigSelect.configsWithDisplayName);
  const currentSaId = useSelector(authSelect.user)?.saId;
  const [search, setSearch] = useState("");

  const filtered = configsWithDisplayName.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (configId: string) => {
    const config = configsWithDisplayName.find((c) => c.configId === configId);
    if (config) {
      // Strip the displayName augmentation before loading into draft
      const { displayName: _dn, ...doc } = config;
      dispatch(prepayConfigActions.setDraft(doc));
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent side="left" className="w-80 flex flex-col gap-3 p-4">
        <SheetHeader>
          <SheetTitle>Open Config</SheetTitle>
        </SheetHeader>

        <Input
          placeholder="Search configs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <ScrollArea className="flex-1">
          <div className="space-y-1 pr-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-1 py-2">
                No configs found.
              </p>
            )}
            {filtered.map((config) => (
              <button
                key={config.configId}
                type="button"
                onClick={() => handleSelect(config.configId)}
                className="w-full text-left px-2 py-2 rounded hover:bg-accent/10 transition-colors"
              >
                <div className="text-sm font-medium text-foreground leading-tight">
                  {config.displayName}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {config.selectionMode}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Season {config.season}
                  </span>
                  {config.saId !== currentSaId && (
                    <span className="text-[10px] text-muted-foreground italic">
                      shared
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
