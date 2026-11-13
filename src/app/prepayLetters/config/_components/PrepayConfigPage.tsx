"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { prepayConfigSelect, prepayLetterVarParsers } from "../prepayConfigSelect";
import { prepayConfigActions } from "../prepayConfigSlice";
import { authSelect } from "@/app/auth/authSlice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { RenewalFlagsDisplay } from "./RenewalFlagsDisplay";
import { FormGroup } from "@/components/FormGroup";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { DatePicker } from "@/components/DatePicker";
import { MentionEditor } from "@/components/MentionEditor/MentionEditor";
import type { PrepayConfig } from "../prepayConfigTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NUMBER_INPUT_CLASS =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-t border-border pt-5 text-sm font-semibold text-foreground">{children}</h2>
  );
}

// ---------------------------------------------------------------------------
// PrepayConfigPage
// ---------------------------------------------------------------------------

export function PrepayConfigPage() {
  const dispatch = useAppDispatch();
  const draft = useSelector(prepayConfigSelect.draft);
  const currentSaId = useSelector(authSelect.user)?.saId;
  // A superuser may open any config for editing, as the admin role could before. Saving still
  // writes the caller's own copy (the server derives the id from name + saId).
  const isSuperUser = useSelector(userCapabilitiesSelect.allows)("superUser");

  const isOwner = !draft?.saId || draft.saId === currentSaId || isSuperUser;
  const isReadOnly = !isOwner;

  if (!draft) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Use <span className="mx-1 font-medium">File → New Config</span> or{" "}
        <span className="mx-1 font-medium">File → Open…</span> to get started.
      </div>
    );
  }

  const update = (patch: Partial<PrepayConfig>) => {
    if (isReadOnly) return;
    dispatch(prepayConfigActions.updateDraft(patch));
  };

  // The vars object passed to MentionEditor — the keys become the available @ variables.
  const letterVars = {
    season: draft.season,
    stdPrepayDiscPercent: draft.stdPrepayDiscPercent,
    upsellPrepayDiscPercent: draft.upsellPrepayDiscPercent,
    expirationDate: draft.expirationDate,
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">

        {isReadOnly && (
          <div className="rounded-md bg-secondary/10 border border-secondary/30 px-3 py-2 text-xs text-secondary">
            This config belongs to <span className="font-semibold">{draft.saId}</span>. You can view it but not edit it. Use{" "}
            <span className="font-medium">File → Save As…</span> to create your own copy.
          </div>
        )}

        {/* ── Season + Expiration ── */}
        <div className="grid grid-cols-2 gap-4">
          <FormGroup>
            <Label>Season</Label>
            <Input
              type="number"
              className={`w-28 ${NUMBER_INPUT_CLASS}`}
              value={draft.season}
              onChange={(e) => update({ season: parseInt(e.target.value, 10) || draft.season })}
              disabled={isReadOnly}
            />
          </FormGroup>

          <FormGroup>
            <Label>Expiration Date</Label>
            <DatePicker
              value={draft.expirationDate}
              onChange={(date) => update({ expirationDate: date ?? "" })}
            />
          </FormGroup>
        </div>

        {/* ── Math ── */}
        <SectionHeading>Math</SectionHeading>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup>
            <Label>Std Prepay Discount %</Label>
            <Input
              type="number"
              className={NUMBER_INPUT_CLASS}
              value={draft.stdPrepayDiscPercent}
              onChange={(e) => update({ stdPrepayDiscPercent: parseFloat(e.target.value) || 0 })}
              disabled={isReadOnly}
            />
          </FormGroup>

          <FormGroup>
            <Label>Upsell Prepay Discount %</Label>
            <Input
              type="number"
              className={NUMBER_INPUT_CLASS}
              value={draft.upsellPrepayDiscPercent}
              onChange={(e) => update({ upsellPrepayDiscPercent: parseFloat(e.target.value) || 0 })}
              disabled={isReadOnly}
            />
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup>
            <Label>Current Services Header</Label>
            <MentionEditor
              value={draft.currentServicesHeader}
              onChangeAction={(html) => update({ currentServicesHeader: html })}
              vars={letterVars}
              parsers={prepayLetterVarParsers}
              disabled={isReadOnly}
              placeholder="e.g. Your current services…"
              minHeight="40px"
            />
          </FormGroup>

          <FormGroup>
            <Label>Upsell Services Header</Label>
            <MentionEditor
              value={draft.upsellServicesHeader}
              onChangeAction={(html) => update({ upsellServicesHeader: html })}
              vars={letterVars}
              parsers={prepayLetterVarParsers}
              disabled={isReadOnly}
              placeholder="e.g. Upgrade your services…"
              minHeight="40px"
            />
          </FormGroup>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={draft.showCreditBalance}
              onCheckedChange={(checked) => update({ showCreditBalance: !!checked })}
              disabled={isReadOnly}
            />
            <span className="text-sm">Show Credit Balance</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={draft.showRemitBalance}
              onCheckedChange={(checked) => update({ showRemitBalance: !!checked })}
              disabled={isReadOnly}
            />
            <span className="text-sm">Show Remit Balance</span>
          </label>
        </div>

        {/* ── Messaging ── */}
        <SectionHeading>Messaging</SectionHeading>

        <FormGroup>
          <Label>Auto-Renew Header</Label>
          <MentionEditor
            value={draft.autoRenewHeader}
            onChangeAction={(html) => update({ autoRenewHeader: html })}
            vars={letterVars}
            parsers={prepayLetterVarParsers}
            disabled={isReadOnly}
            placeholder="e.g. Thank you for renewing!"
            minHeight="40px"
          />
        </FormGroup>

        <FormGroup>
          <Label>Auto-Renew Message</Label>
          <MentionEditor
            value={draft.autoRenewMessage}
            onChangeAction={(html) => update({ autoRenewMessage: html })}
            vars={letterVars}
            parsers={prepayLetterVarParsers}
            disabled={isReadOnly}
            placeholder="Message for auto-renewing customers…"
            minHeight="80px"
          />
        </FormGroup>

        <FormGroup>
          <Label>Don&apos;t Auto-Renew Header</Label>
          <MentionEditor
            value={draft.dontAutoRenewHeader}
            onChangeAction={(html) => update({ dontAutoRenewHeader: html })}
            vars={letterVars}
            parsers={prepayLetterVarParsers}
            disabled={isReadOnly}
            placeholder="e.g. We miss you!"
            minHeight="40px"
          />
        </FormGroup>

        <FormGroup>
          <Label>Don&apos;t Auto-Renew Message</Label>
          <MentionEditor
            value={draft.dontAutoRenewMessage}
            onChangeAction={(html: string) => update({ dontAutoRenewMessage: html })}
            vars={letterVars}
            parsers={prepayLetterVarParsers}
            disabled={isReadOnly}
            placeholder="Message for non-renewing customers…"
            minHeight="80px"
          />
        </FormGroup>

        <FormGroup>
          <Label>Universal Message</Label>
          <MentionEditor
            value={draft.universalMessage}
            onChangeAction={(html) => update({ universalMessage: html })}
            vars={letterVars}
            parsers={prepayLetterVarParsers}
            disabled={isReadOnly}
            placeholder="Message shown to all customers regardless of renewal status…"
            minHeight="80px"
          />
        </FormGroup>

        {/* ── Renewal Flags callout ── */}
        <RenewalFlagsDisplay />

      </div>
    </div>
  );
}
