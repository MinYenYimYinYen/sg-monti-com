"use client";

import Link from "next/link";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { prepayConfigSelect } from "@/app/prepayLetters/config/prepayConfigSelect";
import { prepayConfigActions } from "@/app/prepayLetters/config/prepayConfigSlice";
import { upsellPrioritiesSelect } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesSelect";
import { upsellPrioritiesActions } from "@/app/prepayLetters/upsellPriorities/upsellPrioritiesSlice";
import { renewalLettersSelect } from "../renewalLettersSelect";
import { renewalLettersActions } from "../renewalLettersSlice";
import { useRenewalCustomers } from "../useRenewalCustomers";
import { useRenewalLetterPdf } from "../useRenewalLetterPdf";
import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import type { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";
import { RenewalFlagFilterWarning } from "./RenewalFlagFilterWarning";
import { Button } from "@/style/components/button";
import { Label } from "@/style/components/label";
import { cn } from "@/style/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";

// Module-level so the array is referentially stable for useCustomerContext's effect.
const RENEWAL_CONTEXTS: CustomerContextMode[] = ["renewal"];

/** Value for a draft that was never saved, so it has no configId to select by. */
const UNSAVED_VALUE = "__unsaved__";

function PickerLabel({ children }: { children: string }) {
  return (
    <Label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </Label>
  );
}

export function RenewalSettingsPanel() {
  const dispatch = useAppDispatch();
  useCustomerContext({ contexts: RENEWAL_CONTEXTS });

  const config = useSelector(prepayConfigSelect.draft);
  const configName = useSelector(prepayConfigSelect.activeDisplayName);
  const configs = useSelector(prepayConfigSelect.configsWithDisplayName);
  const upsellDraft = useSelector(upsellPrioritiesSelect.draft);
  const upsellName = useSelector(upsellPrioritiesSelect.activeDisplayName);
  const upsellDocs = useSelector(upsellPrioritiesSelect.docsWithDisplayName);
  const templates = useSelector(renewalLettersSelect.prepayLetterTemplates);
  const selectedTemplate = useSelector(renewalLettersSelect.selectedTemplate);
  const loadedSeason = useSelector(renewalLettersSelect.loadedSeason);
  const isSeasonStale = useSelector(renewalLettersSelect.isSeasonStale);
  const hasLoadedCustomers = useSelector(renewalLettersSelect.hasLoadedCustomers);
  const checkedRows = useSelector(renewalLettersSelect.checkedRows);
  const canCombine = useSelector(renewalLettersSelect.canCombine);
  const canSplit = useSelector(renewalLettersSelect.canSplit);
  const combineMemberKeys = useSelector(renewalLettersSelect.combineMemberKeys);
  const displayBatches = useSelector(renewalLettersSelect.displayBatches);
  const pdfStatus = useSelector(renewalLettersSelect.pdfStatus);
  const { downloadRows, canPickFolder } = useRenewalLetterPdf();
  const isPdfRunning = pdfStatus.state === "running";
  const canDownload =
    !!selectedTemplate && hasLoadedCustomers && !isSeasonStale && !isPdfRunning;

  // The season comes from the open config, not globalSettings: next season's services exist
  // in the CRM before the global season is advanced.
  const { refreshCustomers, canRefresh } = useRenewalCustomers({ seasonOverride: config?.season });

  // Picking replaces the open draft silently, exactly like the Open sheets on the other tabs.
  const pickConfig = (configId: string) => {
    const picked = configs.find((candidate) => candidate.configId === configId);
    if (!picked) return;
    const { displayName, ...doc } = picked;
    void displayName;
    dispatch(prepayConfigActions.setDraft(doc));
  };

  const pickUpsellPriorities = (upsellPrioritiesId: string) => {
    const picked = upsellDocs.find((candidate) => candidate.upsellPrioritiesId === upsellPrioritiesId);
    if (!picked) return;
    const { displayName, ...doc } = picked;
    void displayName;
    dispatch(upsellPrioritiesActions.setDraft(doc));
  };

  const configValue = config ? config.configId || UNSAVED_VALUE : "";
  const upsellValue = upsellDraft ? upsellDraft.upsellPrioritiesId || UNSAVED_VALUE : "";

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-1.5">
        <PickerLabel>Prepay Config</PickerLabel>
        <Select value={configValue} onValueChange={pickConfig}>
          <SelectTrigger className={cn(!config && "border-destructive")}>
            <SelectValue placeholder="Select a config" />
          </SelectTrigger>
          <SelectContent>
            {config && !config.configId && (
              <SelectItem value={UNSAVED_VALUE} disabled>
                {configName || "Untitled"} (unsaved)
              </SelectItem>
            )}
            {configs.map((candidate) => (
              <SelectItem key={candidate.configId} value={candidate.configId}>
                {candidate.displayName}, {candidate.season}
              </SelectItem>
            ))}
            {configs.length === 0 && (
              <SelectItem value="__none__" disabled>
                None saved yet
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Committing thousands of printed letters to the wrong season is the costly mistake. */}
      <div
        className={cn(
          "rounded-md border p-3",
          isSeasonStale ? "border-destructive bg-destructive/10" : "border-border bg-card",
        )}
      >
        <PickerLabel>Season</PickerLabel>
        <p className={cn("text-3xl font-semibold tabular-nums", !config && "text-muted-foreground")}>
          {config ? config.season : "--"}
        </p>
        <p className={cn("text-xs", isSeasonStale ? "text-destructive" : "text-muted-foreground")}>
          {hasLoadedCustomers && typeof loadedSeason === "number"
            ? `Customers loaded for ${loadedSeason}`
            : "No customers loaded yet"}
        </p>
        {isSeasonStale && (
          <p className="mt-1 text-xs font-medium text-destructive">
            The open config is for a different season. Get Customers again.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <PickerLabel>Upsell Priorities</PickerLabel>
        <Select value={upsellValue} onValueChange={pickUpsellPriorities}>
          <SelectTrigger className={cn(!upsellDraft && "border-destructive")}>
            <SelectValue placeholder="Select an upsell list" />
          </SelectTrigger>
          <SelectContent>
            {upsellDraft && !upsellDraft.upsellPrioritiesId && (
              <SelectItem value={UNSAVED_VALUE} disabled>
                {upsellName || "Untitled"} (unsaved)
              </SelectItem>
            )}
            {upsellDocs.map((candidate) => (
              <SelectItem key={candidate.upsellPrioritiesId} value={candidate.upsellPrioritiesId}>
                {candidate.displayName}
              </SelectItem>
            ))}
            {upsellDocs.length === 0 && (
              <SelectItem value="__none__" disabled>
                None saved yet
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <PickerLabel>Form Template</PickerLabel>
        <Select
          value={selectedTemplate?.templateId ?? ""}
          onValueChange={(templateId) =>
            dispatch(renewalLettersActions.setSelectedTemplateId(templateId))
          }
        >
          <SelectTrigger className={cn(!selectedTemplate && "border-destructive")}>
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.templateId} value={template.templateId}>
                {template.displayName}
              </SelectItem>
            ))}
            {templates.length === 0 && (
              <SelectItem value="__none__" disabled>
                None saved yet
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {templates.length === 0 && (
          <p className="text-xs text-muted-foreground">
            <Link href="/formTemplate" className="text-primary hover:underline">
              Create a Prepay Letter template
            </Link>
          </p>
        )}
      </div>

      <RenewalFlagFilterWarning />

      <Button className="w-full" onClick={refreshCustomers} disabled={!canRefresh || !config}>
        Get Customers
      </Button>

      <Button
        className="w-full"
        variant="accent"
        disabled={!canDownload || displayBatches.length === 0}
        onClick={() => void downloadRows({ rows: displayBatches })}
      >
        Download All ({displayBatches.length} PDFs)
      </Button>
      {checkedRows.length > 0 && (
        <Button
          className="w-full"
          variant="accent"
          intensity="soft"
          disabled={!canDownload}
          onClick={() => void downloadRows({ rows: checkedRows })}
        >
          Download Selected ({checkedRows.length})
        </Button>
      )}
      {isPdfRunning && (
        <p role="status" className="text-xs text-muted-foreground">
          Generating {pdfStatus.currentFileName} ({pdfStatus.savedCount + 1} of{" "}
          {pdfStatus.totalCount}). The page may freeze for a moment.
        </p>
      )}
      {!canPickFolder && (
        <p className="text-xs text-muted-foreground">
          This browser cannot save to a folder, so multiple PDFs download one by one.
        </p>
      )}

      {canCombine && (
        <Button
          className="w-full"
          variant="secondary"
          onClick={() =>
            dispatch(renewalLettersActions.combineBatches({ memberKeys: combineMemberKeys }))
          }
        >
          Combine Batches
        </Button>
      )}
      {canSplit && (
        <Button
          className="w-full"
          variant="secondary"
          onClick={() =>
            dispatch(
              renewalLettersActions.splitBatches({
                rowIds: checkedRows.filter((row) => row.isCombined).map((row) => row.rowId),
              }),
            )
          }
        >
          Split Batch
        </Button>
      )}
    </div>
  );
}
