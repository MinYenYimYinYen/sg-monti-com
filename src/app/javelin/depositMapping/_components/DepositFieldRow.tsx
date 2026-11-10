"use client";

import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { Button } from "@/style/components/button";
import { TableCell, TableRow } from "@/style/components/table";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { qboCustomerSelect } from "@/app/qbo/customer/qboCustomerSelect";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { accountSelect } from "@/app/account/accountSelect";
import { MappingPicker } from "@/app/account/_components/MappingPicker";
import { nameTypeForQboAccount } from "@/app/account/_lib/accountLinks";
import { formatQboAccountLabel } from "@/app/account/_lib/accountMappingView";
import { DEPOSIT_LINK_LABELS } from "@/app/javelin/_lib/ckDepositFields";
import { depositFieldMappingSelect } from "@/app/javelin/depositMapping/depositFieldMappingSelect";
import { useDepositFieldMapping } from "@/app/javelin/depositMapping/useDepositFieldMapping";
import { DepositFieldLink } from "@/app/javelin/depositMapping/DepositFieldMappingTypes";
import { LinkStatusBadge } from "@/app/javelin/depositMapping/_components/linkStatusBadge";

const noSuggestions = new Set<string>();

/** One deposit link (a WorkWave field or a check deposit account) and its QuickBooks account. Each change saves at once. */
export function DepositFieldRow({ link }: { link: DepositFieldLink }) {
  const { field, qboAccount, status, nameType, defaultNameId } = link;
  const qboAccountOptions = useSelector(accountSelect.qboAccountOptions);
  const customerOptions = useSelector(accountSelect.customerOptions);
  const vendorOptions = useSelector(accountSelect.vendorOptions);
  const qboAccountMap = useSelector(qboAccountSelect.accountMap);
  const customerMap = useSelector(qboCustomerSelect.customerMap);
  const vendorMap = useSelector(qboVendorSelect.vendorMap);
  const mappingDocs = useSelector(depositFieldMappingSelect.mappingDocs);
  const { upsertLink, removeLink } = useDepositFieldMapping({ autoLoad: false });

  const mappedQboAccountId = mappingDocs.find((doc) => doc.field === field)?.qboAccountId ?? "";
  const selectedLabel = qboAccount
    ? formatQboAccountLabel(qboAccount)
    : mappedQboAccountId
      ? `QuickBooks account ${mappedQboAccountId}`
      : null;

  const isCustomer = nameType === "Customer";
  const nameOptions = isCustomer ? customerOptions : vendorOptions;
  const storedName = defaultNameId
    ? ((isCustomer
        ? customerMap.get(defaultNameId)?.FullyQualifiedName
        : vendorMap.get(defaultNameId)?.DisplayName) ??
      `QuickBooks ${isCustomer ? "customer" : "vendor"} ${defaultNameId}`)
    : null;

  const handleSelectAccount = (qboAccountId: string) => {
    // Keep the default name only when the new account takes the same kind of name.
    const nextNameType = nameTypeForQboAccount(qboAccountMap.get(qboAccountId) ?? null);
    const keepName = nextNameType !== null && nextNameType === nameType && defaultNameId;
    upsertLink({
      field,
      qboAccountId,
      ...(keepName ? { defaultNameType: nextNameType, defaultNameId } : {}),
    });
  };

  return (
    <TableRow variant="alternating">
      <TableCell className="font-medium">{DEPOSIT_LINK_LABELS[field]}</TableCell>
      <TableCell noTruncate>
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <MappingPicker
                options={qboAccountOptions}
                suggestedIds={noSuggestions}
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
              onClick={() => removeLink(field)}
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
                  placeholder={
                    isCustomer ? "Choose default customer" : "Choose default vendor (optional)"
                  }
                  onSelectAction={(nameId) =>
                    upsertLink({
                      field,
                      qboAccountId: mappedQboAccountId,
                      defaultNameType: nameType,
                      defaultNameId: nameId,
                    })
                  }
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
                  onClick={() => upsertLink({ field, qboAccountId: mappedQboAccountId })}
                >
                  <X />
                </Button>
              )}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell noTruncate>
        <LinkStatusBadge status={status} />
      </TableCell>
    </TableRow>
  );
}
