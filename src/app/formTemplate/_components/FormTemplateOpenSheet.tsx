"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { formTemplateSelect } from "../formTemplateSelect";
import { formTemplateActions } from "../formTemplateSlice";
import { authSelect } from "@/app/auth/authSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/style/components/sheet";
import { Input } from "@/style/components/input";
import { Badge } from "@/style/components/badge";
import { ScrollArea } from "@/style/components/scroll-area";

type Props = {
  open: boolean;
  onCloseAction: () => void;
};

export function FormTemplateOpenSheet({ open, onCloseAction }: Props) {
  const dispatch = useAppDispatch();
  const templatesWithDisplayName = useSelector(formTemplateSelect.templatesWithDisplayName);
  const currentSaId = useSelector(authSelect.user)?.saId;
  const [search, setSearch] = useState("");

  const filtered = templatesWithDisplayName.filter((t) =>
    t.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (templateId: string) => {
    const template = templatesWithDisplayName.find((t) => t.templateId === templateId);
    if (template) {
      // Strip the displayName augmentation before loading into draft
      const { displayName: _displayName, ...doc } = template;
      dispatch(formTemplateActions.setDraft(doc));
    }
    onCloseAction();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCloseAction();
      }}
    >
      <SheetContent side="left" className="w-80 flex flex-col gap-3 p-4">
        <SheetHeader>
          <SheetTitle>Open Template</SheetTitle>
        </SheetHeader>

        <Input
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        <ScrollArea className="flex-1">
          <div className="space-y-1 pr-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-1 py-2">
                No templates found.
              </p>
            )}
            {filtered.map((template) => (
              <button
                key={template.templateId}
                type="button"
                onClick={() => handleSelect(template.templateId)}
                className="w-full text-left px-2 py-2 rounded hover:bg-accent/10 transition-colors"
              >
                <div className="text-sm font-medium text-foreground leading-tight">
                  {template.displayName}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {template.dataType}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {template.pageSize}
                  </span>
                  {template.saId !== currentSaId && (
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
