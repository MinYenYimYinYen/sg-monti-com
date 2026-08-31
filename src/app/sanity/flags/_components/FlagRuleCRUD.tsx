"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ChevronDown, Plus, ShieldCheck } from "lucide-react";
import { Container } from "@/components/Containers";
import { Button } from "@/style/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/style/components/card";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import { ScrollArea } from "@/style/components/scroll-area";
import { Separator } from "@/style/components/separator";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { Checkbox } from "@/style/components/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { FormGroup } from "@/components/FormGroup";
import { flagRuleSelect } from "@/app/flagRule/flagRuleSelect";
import { flagRuleActions } from "@/app/flagRule/flagRuleSlice";
import {
  FlagRule,
  FlagRuleKind,
  FLAG_RULE_KINDS,
  FLAG_RULE_KIND_DESCRIPTIONS,
} from "@/app/flagRule/FlagRuleTypes";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { cn } from "@/style/utils";

// ---------------------------------------------------------------------------
// FlagPickerPopover — Popover + Checkbox list for selecting multiple flags
// ---------------------------------------------------------------------------

function FlagPickerPopover({
  selectedFlagIds,
  onFlagIdsChange,
}: {
  selectedFlagIds: number[];
  onFlagIdsChange: (flagIds: number[]) => void;
}) {
  const flagDocs = useSelector(flagSelect.flagDocs);
  const [open, setOpen] = useState(false);

  const sortedFlagDocs = [...flagDocs].sort((a, b) =>
    a.desc.localeCompare(b.desc),
  );

  function handleToggle(flagId: number) {
    const next = selectedFlagIds.includes(flagId)
      ? selectedFlagIds.filter((id) => id !== flagId)
      : [...selectedFlagIds, flagId];
    onFlagIdsChange(next);
  }

  const triggerLabel =
    selectedFlagIds.length === 0
      ? "Select flags…"
      : `${selectedFlagIds.length} flag${selectedFlagIds.length !== 1 ? "s" : ""} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span
            className={cn(
              selectedFlagIds.length === 0 && "text-muted-foreground",
            )}
          >
            {triggerLabel}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <ScrollArea className="h-56">
          <div className="space-y-1 p-2">
            {sortedFlagDocs.length === 0 && (
              <p className="text-xs text-muted-foreground italic px-2 py-1">
                No flags loaded.
              </p>
            )}
            {sortedFlagDocs.map((flag) => (
              <div
                key={flag.flagId}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent/10 cursor-pointer"
                onClick={() => handleToggle(flag.flagId)}
              >
                <Checkbox
                  id={`flag-pick-${flag.flagId}`}
                  checked={selectedFlagIds.includes(flag.flagId)}
                  onCheckedChange={() => handleToggle(flag.flagId)}
                  onClick={(e) => e.stopPropagation()}
                />
                <Label
                  htmlFor={`flag-pick-${flag.flagId}`}
                  className="cursor-pointer font-normal text-sm flex-1"
                >
                  {flag.desc}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// FlagRuleListItem
// ---------------------------------------------------------------------------

function FlagRuleListItem({
  flagRule,
  isSelected,
  onClick,
}: {
  flagRule: FlagRule;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md border px-3 py-2 text-sm transition-colors",
        isSelected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:bg-accent/10 text-foreground",
      )}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium truncate">{flagRule.label}</span>
        <span
          className={cn(
            "ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded",
            flagRule.kind === "XOR"
              ? "bg-primary/15 text-primary"
              : "bg-accent/30 text-foreground",
          )}
        >
          {flagRule.kind}
        </span>
      </div>
      <div className="text-xs text-muted-foreground pl-5">
        {flagRule.flagIds.length} flag{flagRule.flagIds.length !== 1 ? "s" : ""}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// FlagRuleForm
// ---------------------------------------------------------------------------

function FlagRuleForm({
  existingRule,
  onDone,
}: {
  existingRule?: FlagRule;
  onDone: () => void;
}) {
  const dispatch = useAppDispatch();

  const [label, setLabel] = useState(existingRule?.label ?? "");
  const [kind, setKind] = useState<FlagRuleKind>(existingRule?.kind ?? "XOR");
  const [flagIds, setFlagIds] = useState<number[]>(existingRule?.flagIds ?? []);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!existingRule;
  const canSave = label.trim() !== "" && flagIds.length >= 2;

  const handleSave = async () => {
    if (!canSave) return;

    const flagRule: FlagRule = {
      flagRuleId: existingRule?.flagRuleId ?? crypto.randomUUID(),
      label: label.trim(),
      kind,
      flagIds,
      createdAt: existingRule?.createdAt ?? "",
      updatedAt: existingRule?.updatedAt ?? "",
    };

    setSaveStatus("saving");
    await dispatch(
      flagRuleActions.upsert({
        params: { flagRule },
        config: { force: true },
      }),
    );
    setSaveStatus("success");
  };

  const handleSuccessComplete = () => {
    setSaveStatus("idle");
    onDone();
  };

  const handleDelete = async () => {
    if (!existingRule) return;
    await dispatch(
      flagRuleActions.deleteOne({
        params: { flagRuleId: existingRule.flagRuleId },
        config: { force: true },
      }),
    );
    onDone();
  };

  return (
    <CardContent className="pt-4">
      <div className="space-y-4">
        <FormGroup>
          <Label>Label</Label>
          <Input
            placeholder="e.g. Prepay Exclusivity"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Rule Type</Label>
          <RadioGroup
            variant="button-group"
            value={kind}
            onValueChange={(value) => setKind(value as FlagRuleKind)}
          >
            {FLAG_RULE_KINDS.map((k) => (
              <RadioGroupItem key={k} value={k}>
                {k}
              </RadioGroupItem>
            ))}
          </RadioGroup>
          <p className="text-[10px] text-muted-foreground">
            {FLAG_RULE_KIND_DESCRIPTIONS[kind]}
          </p>
        </FormGroup>

        <FormGroup>
          <Label>Flags</Label>
          <FlagPickerPopover
            selectedFlagIds={flagIds}
            onFlagIdsChange={setFlagIds}
          />
          {flagIds.length < 2 && (
            <p className="text-[10px] text-muted-foreground">
              Select at least 2 flags.
            </p>
          )}
        </FormGroup>

        <div className="flex gap-2 items-center">
          <SaveButton
            disabled={!canSave}
            status={saveStatus}
            onClick={handleSave}
            onSuccessComplete={handleSuccessComplete}
          >
            Save
          </SaveButton>
          <Button variant="outline" onClick={onDone}>
            Cancel
          </Button>
        </div>

        {isEditMode && (
          <>
            <Separator className="my-2" />
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                intensity="soft"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Rule
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Are you sure? This will permanently remove this flag rule.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                  >
                    Confirm Delete
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CardContent>
  );
}

// ---------------------------------------------------------------------------
// FlagRuleCRUD
// ---------------------------------------------------------------------------

export function FlagRuleCRUD() {
  const flagRules = useSelector(flagRuleSelect.all);
  const [selected, setSelected] = useState<string | "new" | null>(null);

  const selectedRule =
    typeof selected === "string" && selected !== "new"
      ? flagRules.find((r) => r.flagRuleId === selected) ?? null
      : null;

  const handleDone = () => setSelected(null);

  const sortedRules = [...flagRules].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return (
    <Container variant="scroll-shell" title="Flag Rules">
      <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Left panel: list */}
        <div className="w-[360px] shrink-0 flex flex-col gap-2">
          <Button
            variant="primary"
            intensity="soft"
            className="w-full justify-start gap-2"
            onClick={() => setSelected("new")}
          >
            <Plus className="w-4 h-4" />
            New Rule
          </Button>

          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-1">
              {sortedRules.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-1 py-2">
                  No flag rules yet.
                </p>
              )}
              {sortedRules.map((rule) => (
                <FlagRuleListItem
                  key={rule.flagRuleId}
                  flagRule={rule}
                  isSelected={selected === rule.flagRuleId}
                  onClick={() => setSelected(rule.flagRuleId)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right panel: form */}
        <div className="flex-1 min-w-0">
          {selected === null && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Select a rule to edit, or click &#34;New Rule&#34; to add one.
            </div>
          )}

          {selected === "new" && (
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Add Flag Rule</CardTitle>
                <CardDescription>
                  Define a logical constraint on which flags a customer may
                  have.
                </CardDescription>
              </CardHeader>
              <FlagRuleForm key="new" onDone={handleDone} />
            </Card>
          )}

          {typeof selected === "string" &&
            selected !== "new" &&
            selectedRule && (
              <Card className="max-w-lg">
                <CardHeader>
                  <CardTitle>{selectedRule.label}</CardTitle>
                  <CardDescription>
                    {FLAG_RULE_KIND_DESCRIPTIONS[selectedRule.kind]}
                  </CardDescription>
                </CardHeader>
                <FlagRuleForm
                  key={selected}
                  existingRule={selectedRule}
                  onDone={handleDone}
                />
              </Card>
            )}
        </div>
      </div>
    </Container>
  );
}
