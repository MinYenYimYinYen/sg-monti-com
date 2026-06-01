"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { javelinActions } from "@/app/javelin/javelinSlice";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { Input } from "@/style/components/input";
import { Pencil } from "lucide-react";

export function AccountNumberCell({ crmName }: { crmName: string }) {
  const dispatch = useAppDispatch();
  const liveAccountMap = useSelector(javelinSelect.liveAccountMap);
  const entry = liveAccountMap[crmName];

  // Auto-parse from CRM name as the default if no stored value
  const autoNumber = crmName.split(" - ")[0].trim();
  const currentNumber = entry?.accountNumber ?? autoNumber;

  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(currentNumber);

  const handleBlur = () => {
    const trimmed = localValue.trim();
    if (entry) {
      dispatch(
        javelinActions.setLiveAccountEntry({
          crmName,
          entry: { ...entry, accountNumber: trimmed || undefined },
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
        placeholder="Account number"
        className="h-7 text-sm w-24"
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
        aria-label="Edit account number"
      >
        <Pencil size={13} />
      </button>
    </span>
  );
}
