"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { Input } from "@/style/components/input";
import { Pencil } from "lucide-react";

export function AccountNameCell({ crmName }: { crmName: string }) {
  const dispatch = useAppDispatch();
  const liveAccountMap = useSelector(javelinSelect.liveAccountMap);
  const entry = liveAccountMap[crmName];
  const currentQbName = entry?.qbName ?? "";

  const [isEditing, setIsEditing] = useState(!currentQbName);
  const [localValue, setLocalValue] = useState(currentQbName);

  const handleBlur = () => {
    const trimmed = localValue.trim();
    if (trimmed) {
      dispatch(
        javelinActions.setLiveAccountEntry({
          crmName,
          entry: { ...entry, qbName: trimmed },
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
        placeholder="QB account name (name only)"
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
      {localValue}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Edit QB account name"
      >
        <Pencil size={13} />
      </button>
    </span>
  );
}
