"use client";

import { useSelector } from "react-redux";
import { Download, X } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { Button } from "@/style/components/button";
import { CustomerLink } from "@/app/realGreen/customer/components/CustomerLink";
import { renewalLettersSelect } from "../renewalLettersSelect";
import { renewalLettersActions } from "../renewalLettersSlice";
import { useRenewalLetterPdf } from "../useRenewalLetterPdf";
import { cn } from "@/style/utils";
import { RENEWAL_RULE_KEYS } from "../renewalBatchLevels";
import type { CustomerLetter, CustomerLetterRole } from "../renewalLettersLogic";

const ROLE_LABELS: Record<CustomerLetterRole, string> = {
  master: "Master",
  subAccount: "Sub-account",
  customer: "Customer",
};

const STATUS_NOTES = {
  confirmed: "Already confirmed, so no letter is printed.",
  missed: "No rule placed this customer in a batch, so there is no letter.",
} as const;

/** The same three categories the batch view breaks out, for one account's letter. */
function CategoryLine({ letter }: { letter: CustomerLetter }) {
  const { row } = letter;
  if (!row) return null;
  const renewal = row.renewalKey === RENEWAL_RULE_KEYS.autoRenew ? "Auto Renew" : "Don't Auto Renew";
  // Group Bill rows have no upsell label because each letter carries its own.
  const upsell = row.letters[0]?.upsell?.description ?? "No Upsell";
  return (
    <p className="text-xs text-muted-foreground">
      {renewal} <span aria-hidden>·</span> {row.billingLabel} <span aria-hidden>·</span> {upsell}
    </p>
  );
}

function AccountRow({ letter, isSelected }: { letter: CustomerLetter; isSelected: boolean }) {
  const selectedTemplate = useSelector(renewalLettersSelect.selectedTemplate);
  const isPdfRunning = useSelector(renewalLettersSelect.isPdfRunning);
  const { downloadRows } = useRenewalLetterPdf();
  const { customer, row, status } = letter;
  const name = `${customer.custId}-${customer.displayName}`;

  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b border-border/50 py-2",
        isSelected && "bg-accent/10",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CustomerLink
            customerId={customer.custId}
            customerTab="customer"
            className="truncate text-primary hover:underline"
          >
            {name}
          </CustomerLink>
          <span className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 text-xs text-muted-foreground">
            {ROLE_LABELS[letter.role]}
          </span>
        </div>
        <CategoryLine letter={letter} />
        {status !== "letter" && (
          <p className="text-xs text-muted-foreground">{STATUS_NOTES[status]}</p>
        )}
      </div>
      {row && (
        <Button
          size="sm"
          variant="outline"
          intensity="ghost"
          disabled={!selectedTemplate || isPdfRunning}
          title={selectedTemplate ? "Download this letter as a PDF" : "Select a form template first"}
          aria-label={`Download ${name}`}
          onClick={() => void downloadRows({ rows: [row], fileNameMode: "customer" })}
        >
          <Download className="h-3 w-3" />
        </Button>
      )}
    </li>
  );
}

/** Replaces the batch counts while a customer is picked in Find Customer. */
export function RenewalSelectedCustomerPanel() {
  const dispatch = useAppDispatch();
  const customer = useSelector(renewalLettersSelect.selectedCustomer);
  const masterId = useSelector(renewalLettersSelect.selectedGroupMasterId);
  const master = useSelector(renewalLettersSelect.selectedMasterAccount);
  const subAccounts = useSelector(renewalLettersSelect.selectedSubAccounts);
  const letters = useSelector(renewalLettersSelect.selectedCustomerLetters);
  const selectedTemplate = useSelector(renewalLettersSelect.selectedTemplate);
  const isPdfRunning = useSelector(renewalLettersSelect.isPdfRunning);
  const { downloadRows } = useRenewalLetterPdf();

  if (!customer || !letters) return null;

  const rows = letters.flatMap((letter) => (letter.row ? [letter.row] : []));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {customer.custId}-{customer.displayName}
          </h2>
          {masterId !== null && (
            <p className="text-xs text-muted-foreground">
              {customer.isMasterAcct
                ? "Group bill master"
                : `Sub-account in group ${masterId}, showing the whole group`}
              {", "}
              {subAccounts.length} loaded {subAccounts.length === 1 ? "sub-account" : "sub-accounts"}
            </p>
          )}
          {/* A master need not have services, so it is often absent. It is not fetched. */}
          {masterId !== null && !master && (
            <p className="text-xs text-muted-foreground">
              Master {masterId} is not loaded, so it has no letter here.
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          intensity="ghost"
          aria-label="Clear selected customer"
          onClick={() => dispatch(renewalLettersActions.setSelectedCustId(null))}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <ul className="rounded-md border border-border bg-card px-3">
        {letters.map((letter) => (
          <AccountRow
            key={letter.customer.custId}
            letter={letter}
            isSelected={letter.customer.custId === customer.custId}
          />
        ))}
      </ul>

      {letters.length > 1 && (
        <Button
          variant="accent"
          disabled={!selectedTemplate || isPdfRunning || rows.length === 0}
          onClick={() => void downloadRows({ rows, fileNameMode: "customer" })}
        >
          Download All ({rows.length} {rows.length === 1 ? "PDF" : "PDFs"})
        </Button>
      )}
    </div>
  );
}
