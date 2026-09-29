"use client";

import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { prepayConfigSelect } from "../prepayConfigSelect";
import { prepayConfigActions } from "../prepayConfigSlice";
import { authSelect } from "@/app/auth/authSlice";
import { RenewalFlagsDisplay } from "./RenewalFlagsDisplay";
import { FormGroup } from "@/components/FormGroup";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Checkbox } from "@/style/components/checkbox";
import { RadioGroup, RadioGroupItem } from "@/style/components/radio-group";
import { DatePicker } from "@/components/DatePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";
import type { PrepayConfigDoc } from "../prepayConfigTypes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PrepayConfigPage
// ---------------------------------------------------------------------------

export function PrepayConfigPage() {
  const dispatch = useAppDispatch();
  const draft = useSelector(prepayConfigSelect.draft);
  const currentSaId = useSelector(authSelect.user)?.saId;
  const role = useSelector(authSelect.role);

  const isOwner = !draft?.saId || draft.saId === currentSaId || role === "admin";
  const isReadOnly = !isOwner;

  if (!draft) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Use <span className="mx-1 font-medium">File → New Config</span> or{" "}
        <span className="mx-1 font-medium">File → Open…</span> to get started.
      </div>
    );
  }

  const update = (patch: Partial<PrepayConfigDoc>) => {
    if (isReadOnly) return;
    dispatch(prepayConfigActions.updateDraft(patch));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-4">

        {isReadOnly && (
          <div className="rounded-md bg-secondary/10 border border-secondary/30 px-3 py-2 text-xs text-secondary">
            This config belongs to <span className="font-semibold">{draft.saId}</span>. You can view it but not edit it. Use{" "}
            <span className="font-medium">File → Save As…</span> to create your own copy.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* ── Left column: Identity + Math ── */}
          <div className="space-y-4">

            {/* ── Identity ── */}
            <SectionCard title="Identity">
              <FormGroup>
                <Label>Config Name</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="e.g. November Letters"
                  disabled={isReadOnly}
                />
              </FormGroup>

              <FormGroup>
                <Label>Selection Mode</Label>
                <RadioGroup
                  variant="button-group"
                  value={draft.selectionMode}
                  onValueChange={(v) => update({ selectionMode: v as PrepayConfigDoc["selectionMode"] })}
                  disabled={isReadOnly}
                >
                  <RadioGroupItem value="single">Single Customer</RadioGroupItem>
                  <RadioGroupItem value="batch">Batch</RadioGroupItem>
                </RadioGroup>
              </FormGroup>

              <FormGroup>
                <Label>Season</Label>
                <Input
                  type="number"
                  className="w-28 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={draft.season}
                  onChange={(e) => update({ season: parseInt(e.target.value, 10) || draft.season })}
                  disabled={isReadOnly}
                />
              </FormGroup>
            </SectionCard>

            {/* ── Math ── */}
            <SectionCard title="Math">
              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <Label>Std Prepay Discount %</Label>
                  <Input
                    type="number"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={draft.stdPrepayDiscPercent}
                    onChange={(e) => update({ stdPrepayDiscPercent: parseFloat(e.target.value) || 0 })}
                    disabled={isReadOnly}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Upsell Prepay Discount %</Label>
                  <Input
                    type="number"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={draft.upsellPrepayDiscPercent}
                    onChange={(e) => update({ upsellPrepayDiscPercent: parseFloat(e.target.value) || 0 })}
                    disabled={isReadOnly}
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
            </SectionCard>

          </div>

          {/* ── Right column: Messaging + Renewal Flags ── */}
          <div className="space-y-4">

            {/* ── Messaging ── */}
            <SectionCard title="Messaging">
              <FormGroup>
                <Label>Expiration Date</Label>
                <DatePicker
                  value={draft.expirationDate}
                  onChange={(date) => update({ expirationDate: date ?? "" })}
                />
              </FormGroup>

              <FormGroup>
                <Label>Universal Message</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder="Message shown to all customers regardless of renewal status…"
                  value={draft.universalMessage}
                  onChange={(e) => update({ universalMessage: e.target.value })}
                  disabled={isReadOnly}
                />
              </FormGroup>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <Label>Auto-Renew Header</Label>
                  <Input
                    value={draft.autoRenewHeader}
                    onChange={(e) => update({ autoRenewHeader: e.target.value })}
                    placeholder="e.g. Thank you for renewing!"
                    disabled={isReadOnly}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Don&apos;t Auto-Renew Header</Label>
                  <Input
                    value={draft.dontAutoRenewHeader}
                    onChange={(e) => update({ dontAutoRenewHeader: e.target.value })}
                    placeholder="e.g. We miss you!"
                    disabled={isReadOnly}
                  />
                </FormGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <Label>Auto-Renew Message</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="Message for auto-renewing customers…"
                    value={draft.autoRenewMessage}
                    onChange={(e) => update({ autoRenewMessage: e.target.value })}
                    disabled={isReadOnly}
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Don&apos;t Auto-Renew Message</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="Message for non-renewing customers…"
                    value={draft.dontAutoRenewMessage}
                    onChange={(e) => update({ dontAutoRenewMessage: e.target.value })}
                    disabled={isReadOnly}
                  />
                </FormGroup>
              </div>
            </SectionCard>

            {/* ── Renewal Flags ── */}
            <SectionCard title="Renewal Flags">
              <RenewalFlagsDisplay />
            </SectionCard>

          </div>

        </div>
      </div>
    </div>
  );
}
