"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { Input } from "@/style/components/input";
import { Pencil } from "lucide-react";

export function NameCell({ crmName }: { crmName: string }) {
  const dispatch = useAppDispatch();
  const liveAccountMap = useSelector(javelinSelect.liveAccountMap);
  const entry = liveAccountMap[crmName];
  const currentName = entry?.name ?? "";

  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(currentName);

  const handleBlur = () => {
    const trimmed = localValue.trim();
    // Always dispatch to update the name field (even if empty — clears it)
    if (entry) {
      dispatch(
        javelinActions.setLiveAccountEntry({
          crmName,
          entry: { ...entry, name: trimmed || undefined },
        }),
      );
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={localValue}
        placeholder="Name (optional)"
        className="h-7 text-sm"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      {localValue || <span className="text-muted-foreground text-xs">—</span>}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Edit Name"
      >
        <Pencil size={13} />
      </button>
    </span>
  );
}
