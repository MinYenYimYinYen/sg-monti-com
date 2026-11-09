"use client";

import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { TableCell, TableRow } from "@/style/components/table";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { qboCustomerSelect } from "@/app/qbo/customer/qboCustomerSelect";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { accountSelect } from "@/app/account/accountSelect";
import { useAccount } from "@/app/account/useAccount";
import { AccountLinkStatus, RgAccountLink } from "@/app/account/AccountMappingTypes";
import { MappingPicker } from "@/app/account/_components/MappingPicker";
import { nameTypeForQboAccount } from "@/app/account/_lib/accountLinks";
import {
  formatQboAccountLabel,
  suggestedQboAccountIds,
} from "@/app/account/_lib/accountMappingView";

type StatusDisplay = {
  label: string;
  variant: "accent" | "primary" | "destructive";
  intensity: "soft" | "ghost" | "solid";
};

const statusDisplay: Record<AccountLinkStatus, StatusDisplay> = {
  mapped: { label: "Mapped", variant: "accent", intensity: "soft" },
  unmapped: { label: "Unmapped", variant: "primary", intensity: "ghost" },
  unverified: { label: "Unverified", variant: "primary", intensity: "soft" },
  inactive: { label: "QBO account inactive", variant: "destructive", intensity: "soft" },
  missing: { label: "QBO account missing", variant: "destructive", intensity: "soft" },
  needsName: { label: "Needs customer", variant: "destructive", intensity: "soft" },
};

const noSuggestions = new Set<string>();

/** One RealGreen account and the QuickBooks account it is linked to. Each change saves at once. */
export function AccountMappingRow({ link }: { link: RgAccountLink }) {
  const { rgAccount, qboAccount, status, nameType, defaultNameId } = link;
  const qboAccounts = useSelector(qboAccountSelect.accounts);
  const qboAccountMap = useSelector(qboAccountSelect.accountMap);
  const qboAccountOptions = useSelector(accountSelect.qboAccountOptions);
  const customerOptions = useSelector(accountSelect.customerOptions);
  const vendorOptions = useSelector(accountSelect.vendorOptions);
  const customerMap = useSelector(qboCustomerSelect.customerMap);
  const vendorMap = useSelector(qboVendorSelect.vendorMap);
  const mappingDocs = useSelector(accountSelect.mappingDocs);
  const { upsertMapping, removeMapping } = useAccount({ autoLoad: false });

  const mappedQboAccountId =
    mappingDocs.find((doc) => doc.rgAccountId === rgAccount.rgAccountId)?.qboAccountId ?? "";
  // An inactive account is not an option, and a missing one is unknown. Show what is stored.
  const selectedLabel = qboAccount
    ? formatQboAccountLabel(qboAccount)
    : mappedQboAccountId
      ? `QuickBooks account ${mappedQboAccountId}`
      : null;
  const display = statusDisplay[status];

  // The name picker needs a valid link: until then the account type, and so the kind of name, is unknown.
  const isCustomer = nameType === "Customer";
  const nameOptions = isCustomer ? customerOptions : vendorOptions;
  const storedName = defaultNameId
    ? (isCustomer ? customerMap.get(defaultNameId)?.FullyQualifiedName : vendorMap.get(defaultNameId)?.DisplayName) ??
      `QuickBooks ${isCustomer ? "customer" : "vendor"} ${defaultNameId}`
    : null;

  const handleSelectAccount = (qboAccountId: string) => {
    // Keep the default name only when the new account takes the same kind of name.
    const nextNameType = nameTypeForQboAccount(qboAccountMap.get(qboAccountId) ?? null);
    const keepName = nextNameType !== null && nextNameType === nameType && defaultNameId;
    upsertMapping({
      rgAccountId: rgAccount.rgAccountId,
      qboAccountId,
      ...(keepName ? { defaultNameType: nextNameType, defaultNameId } : {}),
    });
  };

  const handleSelectName = (nameId: string) => {
    if (!nameType) return;
    upsertMapping({
      rgAccountId: rgAccount.rgAccountId,
      qboAccountId: mappedQboAccountId,
      defaultNameType: nameType,
      defaultNameId: nameId,
    });
  };

  const handleClearName = () => {
    upsertMapping({ rgAccountId: rgAccount.rgAccountId, qboAccountId: mappedQboAccountId });
  };

  return (
    <TableRow variant="alternating">
      <TableCell className="font-medium">{rgAccount.rgAccountId}</TableCell>
      <TableCell>
        {rgAccount.rgDescription || (
          <span className="text-muted-foreground">(no description)</span>
        )}
      </TableCell>
      <TableCell noTruncate>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <MappingPicker
                options={qboAccountOptions}
                suggestedIds={suggestedQboAccountIds({
                  rgAccountId: rgAccount.rgAccountId,
                  qboAccounts,
                })}
                value={mappedQboAccountId}
                selectedLabel={selectedLabel}
                placeholder="Choose account"
                onSelectAction={handleSelectAccount}
              />
            </div>
            <Button
              variant="primary"
              intensity="ghost"
              size="icon"
              aria-label="Remove link"
              disabled={!mappedQboAccountId}
              onClick={() => removeMapping(rgAccount.rgAccountId)}
            >
              <X />
            </Button>
          </div>

          {nameType && (
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <MappingPicker
                  options={nameOptions}
                  suggestedIds={noSuggestions}
                  value={defaultNameId ?? ""}
                  selectedLabel={storedName}
                  placeholder={isCustomer ? "Choose default customer" : "Choose default vendor (optional)"}
                  onSelectAction={handleSelectName}
                />
              </div>
              {/* A customer is required on Accounts Receivable, so only the optional vendor can be cleared. */}
              {!isCustomer && (
                <Button
                  variant="primary"
                  intensity="ghost"
                  size="icon"
                  aria-label="Remove default vendor"
                  disabled={!defaultNameId}
                  onClick={handleClearName}
                >
                  <X />
                </Button>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell noTruncate>
        <Badge variant={display.variant} intensity={display.intensity}>
          {display.label}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
