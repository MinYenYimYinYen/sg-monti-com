"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { quickSendActions } from "../quickSendSlice";
import { quickSendSelect } from "../quickSendSelect";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";

type Props = {
  auxId: string;
};

/** Derives a human-readable label from an aux ID: "aux" → "Aux", "aux_2" → "Aux 2". */
function auxLabel(auxId: string): string {
  if (auxId === "aux") return "Aux";
  const n = auxId.slice(4); // "_2" → "2"
  return `Aux ${n.replace("_", "")}`;
}

export function AuxConfig({ auxId }: Props) {
  const dispatch = useAppDispatch();
  const auxValues = useSelector(quickSendSelect.auxValues);
  const value = auxValues[auxId] ?? "";

  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-b border-border">
      <Label className="text-xs text-muted-foreground">{auxLabel(auxId)}</Label>
      <Input
        className="h-8 text-sm"
        placeholder="Value…"
        value={value}
        onChange={(e) =>
          dispatch(quickSendActions.setAuxValue({ id: auxId, value: e.target.value }))
        }
      />
    </div>
  );
}
