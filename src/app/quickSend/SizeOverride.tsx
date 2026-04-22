"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "./quickSendSlice";
import { quickSendSelect } from "./quickSendSelect";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";

export function SizeOverride() {
  const dispatch = useAppDispatch();
  const customerState = useSelector(quickSendSelect.customerState);

  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-b border-border">
      <Label className="text-xs text-muted-foreground">Size override</Label>
      <Input
        className="h-8 text-sm"
        placeholder="Lawn size…"
        value={customerState.sizeOverride}
        onChange={(e) =>
          dispatch(quickSendActions.setSizeOverride(e.target.value))
        }
      />
    </div>
  );
}
