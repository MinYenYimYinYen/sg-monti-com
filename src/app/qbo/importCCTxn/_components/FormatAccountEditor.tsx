"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Badge } from "@/style/components/badge";
import { qboAccountSelect } from "@/app/qbo/account/qboAccountSelect";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { importCCTxnCapabilities } from "@/app/qbo/importCCTxn/importCCTxnCapabilities";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { useImportCCTxnMapping } from "@/app/qbo/importCCTxn/useImportCCTxnMapping";
import { validateFormatAccount } from "@/app/qbo/importCCTxn/_lib/importMappingUtils";
import { ImportFormatId } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

/**
 * Chooses which QuickBooks credit card accounts a bank format posts to, and which is the
 * default. Reads its own data; key it on formatId so it restarts from what was stored.
 */
export function FormatAccountEditor({
  formatId,
  label,
}: {
  formatId: ImportFormatId;
  label: string;
}) {
  const creditCardAccounts = useSelector(qboAccountSelect.creditCardAccounts);
  const stored = useSelector(importCCTxnMappingSelect.formatAccountMap).get(formatId);
  const canEdit = useSelector(userCapabilitiesSelect.allows)(
    importCCTxnCapabilities.can.formatAccounts.write,
  );
  const { saveFormatAccount } = useImportCCTxnMapping({ autoLoad: false });

  const [accountIds, setAccountIds] = useState<string[]>(stored?.accountIds ?? []);
  const [defaultAccountId, setDefaultAccountId] = useState(stored?.defaultAccountId ?? "");

  const toggleAccount = (accountId: string) => {
    const next = accountIds.includes(accountId)
      ? accountIds.filter((id) => id !== accountId)
      : [...accountIds, accountId];
    setAccountIds(next);
    // The default must stay one of the chosen accounts.
    if (!next.includes(defaultAccountId)) setDefaultAccountId(next[0] ?? "");
  };

  const candidate = { formatId, accountIds, defaultAccountId };
  const problems = validateFormatAccount(candidate);
  const isChanged =
    JSON.stringify(accountIds) !== JSON.stringify(stored?.accountIds ?? []) ||
    defaultAccountId !== (stored?.defaultAccountId ?? "");

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {stored && !isChanged && (
          <Badge variant="accent" intensity="soft">
            Saved
          </Badge>
        )}
      </div>

      {creditCardAccounts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No credit card accounts loaded from QuickBooks yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {creditCardAccounts.map((account) => (
            <li key={account.Id} className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={accountIds.includes(account.Id)}
                disabled={!canEdit}
                onCheckedChange={() => toggleAccount(account.Id)}
                aria-label={account.FullyQualifiedName}
              />
              <span className="text-foreground">{account.FullyQualifiedName}</span>
              {!account.Active && (
                <Badge variant="destructive" intensity="ghost">
                  Inactive
                </Badge>
              )}
              {accountIds.includes(account.Id) && (
                <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="radio"
                    name={`default-${formatId}`}
                    checked={defaultAccountId === account.Id}
                    disabled={!canEdit}
                    onChange={() => setDefaultAccountId(account.Id)}
                  />
                  Default
                </label>
              )}
            </li>
          ))}
        </ul>
      )}

      {isChanged && problems.length > 0 && accountIds.length > 0 && (
        <p className="text-xs text-destructive">{problems.join(" ")}</p>
      )}

      <Button
        variant="primary"
        disabled={!canEdit || !isChanged || problems.length > 0}
        onClick={() => saveFormatAccount(candidate)}
      >
        Save
      </Button>
    </div>
  );
}
