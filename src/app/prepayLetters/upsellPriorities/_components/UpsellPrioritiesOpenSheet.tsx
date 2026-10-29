"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { upsellPrioritiesSelect } from "../upsellPrioritiesSelect";
import { upsellPrioritiesActions } from "../upsellPrioritiesSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/style/components/sheet";
import { Input } from "@/style/components/input";
import { ScrollArea } from "@/style/components/scroll-area";

type Props = {
  open: boolean;
  onCloseAction: () => void;
};

export function UpsellPrioritiesOpenSheet({ open, onCloseAction }: Props) {
  const dispatch = useAppDispatch();
  const docsWithDisplayName = useSelector(upsellPrioritiesSelect.docsWithDisplayName);
  const [search, setSearch] = useState("");

  const filtered = docsWithDisplayName.filter((doc) =>
    doc.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelect(upsellPrioritiesId: string) {
    const match = docsWithDisplayName.find((d) => d.upsellPrioritiesId === upsellPrioritiesId);
    if (match) {
      const { displayName, ...doc } = match;
      void displayName;
      dispatch(upsellPrioritiesActions.setDraft(doc));
    }
    onCloseAction();
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCloseAction();
      }}
    >
      <SheetContent side="left" className="w-80 flex flex-col gap-3 p-4">
        <SheetHeader>
          <SheetTitle>Open Upsell Priorities</SheetTitle>
        </SheetHeader>

        <Input
          placeholder="Search lists…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <ScrollArea className="flex-1">
          <div className="space-y-1 pr-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-1 py-2">No lists found.</p>
            )}
            {filtered.map((doc) => (
              <button
                key={doc.upsellPrioritiesId}
                type="button"
                onClick={() => handleSelect(doc.upsellPrioritiesId)}
                className="w-full text-left px-2 py-2 rounded hover:bg-accent/10 transition-colors"
              >
                <div className="text-sm font-medium text-foreground leading-tight">
                  {doc.displayName}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {doc.priorities.length} upsell{doc.priorities.length === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
