"use client";
import React from "react";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/style/components/sheet";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/style/components/field";
import {
  Unit,
  UL,
  getMetricForUL,
} from "@/app/realGreen/product/_lib/types/UnitTypes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/style/components/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface EditUnitSheetProps {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditUnitSheet({
  unit,
  open,
  onOpenChange,
}: EditUnitSheetProps) {
  const { updateUnit } = useProduct({});
  const [newDesc, setNewDesc] = React.useState<UL>(unit?.desc || UL.unknown);
  const [status, setStatus] = React.useState<SaveStatus>("idle");

  React.useEffect(() => {
    if (unit) {
      setNewDesc(unit.desc as UL);
    }
  }, [unit]);

  const canSave = unit && newDesc !== unit.desc;

  //todo: error on save.  This component was created by AI.
  // Investigate.
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (unit && newDesc) {
      setStatus("saving");
      try {
        await updateUnit({
          ...unit,
          desc: newDesc,
          metric: getMetricForUL(newDesc),
        } as Unit);
        setStatus("success");
      } catch (error) {
        console.error("Failed to save unit", error);
        setStatus("idle");
      }
    }
  };

  if (!unit) return null;

  return (
    <Sheet
      key={`${unit.unitId}-${unit.desc}`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent className={"space-y-4"}>
        <SheetHeader>
          <SheetTitle>Set Unit Description</SheetTitle>
          <SheetDescription>
            This will update the unit description displayed for all products using
            this unit.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSave}>
          <FieldGroup>
            <Field orientation={"grid"}>
              <FieldLabel>Unit Description:</FieldLabel>
              <FieldContent>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {newDesc}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {Object.values(UL).map((ulValue) => (
                      <DropdownMenuItem
                        key={ulValue}
                        onClick={() => setNewDesc(ulValue)}
                      >
                        {ulValue}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </FieldContent>
            </Field>
          </FieldGroup>
        </form>
        <SheetFooter>
          <Button
            variant="destructive"
            intensity={"soft"}
            onClick={() => onOpenChange(false)}
            disabled={status === "saving" || status === "success"}
          >
            Cancel
          </Button>
          <SaveButton
            variant="primary"
            onClick={handleSave}
            disabled={!canSave}
            status={status}
            onSuccessComplete={() => {
              onOpenChange(false);
              setStatus("idle");
            }}
          >
            Save
          </SaveButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
