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
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { FormGroup } from "@/components/FormGroup";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/style/components/field";

interface EditCategorySheetProps {
  categoryId: number;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCategorySheet({
  categoryId,
  categoryName,
  open,
  onOpenChange,
}: EditCategorySheetProps) {
  const { updateCategory } = useProduct({});
  const [newName, setNewName] = React.useState(
    categoryName === baseStrId ? "" : categoryName,
  );

  const canSave = newName !== categoryName && newName.trim().length > 0;
  const handleSave = () => {
    const trimmedNewName = newName.trim();
    if (trimmedNewName) {
      updateCategory(categoryId, trimmedNewName);
      onOpenChange(false);
    }
  };

  return (
    <Sheet
      key={`${categoryId}-${categoryName}`}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Set Category Name</SheetTitle>
          <SheetDescription>
            This will update the category displayed for all products in this
            category. It will not affect data coming from SA5.
          </SheetDescription>
        </SheetHeader>
        {/*<FormGroup>*/}
        {/*  <Label>Category Name:</Label>*/}
        {/*  <Input value={newName} onChange={(e) => setNewName(e.target.value)} />*/}
        {/*</FormGroup>*/}
        <FieldGroup>
          <Field orientation={"grid"}>
            <FieldLabel>Category Name:</FieldLabel>
            <FieldContent>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
              <FieldDescription>
                This will update the category displayed for all products in this
                category. It will not affect data coming from SA5.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSave} disabled={!canSave}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
