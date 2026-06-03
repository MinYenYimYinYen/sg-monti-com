"use client";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { depositSelect } from "@/app/javelin/depositSelect";
import { depositActions } from "@/app/javelin/depositSlice";
import { DepositAccountEntry, DepositField, DepositRow } from "@/app/javelin/JavelinTypes";
import { DEPOSIT_FIELDS, FIELD_NATURAL_SIDE } from "@/app/javelin/_lib/depositTransform";
import { Number } from "@/components/Number";
import { Input } from "@/style/components/input";
import { Pencil } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";

const FIELD_LABELS: Record<DepositField, string> = {
  salesAmount: "Sales Amount",
  refundAmount: "Refund Amount",
  chargeBackAmount: "Chargeback Amount",
  adjustmentAmount: "Adjustment Amount",
  fees: "Fees",
  netDeposit: "Net Deposit",
};

function getEffectiveSide(
  field: DepositField,
  value: number,
): "debit" | "credit" {
  const naturalSide = FIELD_NATURAL_SIDE[field];
  if (value >= 0) return naturalSide;
  return naturalSide === "debit" ? "credit" : "debit";
}

function DepositAccountNumberCell({ field }: { field: DepositField }) {
  const dispatch = useAppDispatch();
  const liveAccountMap = useSelector(depositSelect.liveAccountMap);
  const entry = liveAccountMap[field];
  const currentNumber = entry?.accountNumber ?? "";

  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(currentNumber);

  const handleBlur = () => {
    const trimmed = localValue.trim();
    if (entry) {
      dispatch(
        depositActions.setLiveAccountEntry({
          field,
          entry: { ...entry, accountNumber: trimmed || undefined },
        }),
      );
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={localValue}
        placeholder="Account number"
        className="h-7 text-sm w-24"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      {localValue || <span className="text-muted-foreground text-xs">—</span>}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Edit account number"
      >
        <Pencil size={13} />
      </button>
    </span>
  );
}

function DepositAccountNameCell({ field }: { field: DepositField }) {
  const dispatch = useAppDispatch();
  const liveAccountMap = useSelector(depositSelect.liveAccountMap);
  const entry = liveAccountMap[field];
  const currentQbName = entry?.qbName ?? "";

  const [isEditing, setIsEditing] = useState(!currentQbName);
  const [localValue, setLocalValue] = useState(currentQbName);

  const handleBlur = () => {
    const trimmed = localValue.trim();
    if (trimmed) {
      const updatedEntry: DepositAccountEntry = { ...(entry ?? { qbName: "" }), qbName: trimmed };
      dispatch(depositActions.setLiveAccountEntry({ field, entry: updatedEntry }));
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={localValue}
        placeholder="QB account name"
        className="h-7 text-sm w-full"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      {localValue}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Edit QB account name"
      >
        <Pencil size={13} />
      </button>
    </span>
  );
}

function DepositNameCell({ field }: { field: DepositField }) {
  const dispatch = useAppDispatch();
  const liveAccountMap = useSelector(depositSelect.liveAccountMap);
  const entry = liveAccountMap[field];
  const currentName = entry?.name ?? "";

  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(currentName);

  const handleBlur = () => {
    const trimmed = localValue.trim();
    if (entry) {
      dispatch(
        depositActions.setLiveAccountEntry({
          field,
          entry: { ...entry, name: trimmed || undefined },
        }),
      );
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        value={localValue}
        placeholder="Vendor / customer name (optional)"
        className="h-7 text-sm w-full"
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      {localValue || <span className="text-muted-foreground text-xs">—</span>}
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Edit vendor name"
      >
        <Pencil size={13} />
      </button>
    </span>
  );
}

function DepositRowSummary({ row }: { row: DepositRow }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-normal">
      <span className="font-medium">{row.date}</span>
      {row.salesAmount !== 0 && (
        <span>
          Sales: <Number isMoney decimals={2}>{row.salesAmount}</Number>
        </span>
      )}
      {row.refundAmount !== 0 && (
        <span>
          Refunds: <Number isMoney decimals={2}>{row.refundAmount}</Number>
        </span>
      )}
      {row.chargeBackAmount !== 0 && (
        <span>
          Chargebacks: <Number isMoney decimals={2}>{row.chargeBackAmount}</Number>
        </span>
      )}
      {row.fees !== 0 && (
        <span>
          Fees: <Number isMoney decimals={2}>{row.fees}</Number>
        </span>
      )}
      {row.netDeposit !== 0 && (
        <span>
          Net Deposit: <Number isMoney decimals={2}>{row.netDeposit}</Number>
        </span>
      )}
    </span>
  );
}

export function DepositResultsTable() {
  const rows = useSelector(depositSelect.rows);
  const errors = useSelector(depositSelect.errors);
  const warnings = useSelector(depositSelect.warnings);
  const rowBalances = useSelector(depositSelect.rowBalances);
  const liveAccountMap = useSelector(depositSelect.liveAccountMap);

  if (rows.length === 0 && errors.length === 0) {
    return null;
  }

  if (errors.length > 0) {
    return (
      <div className="mt-4">
        <ul className="space-y-1">
          {errors.map((error, i) => (
            <li key={i} className="text-sm text-destructive">
              {error}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {warnings.length > 0 && (
        <ul className="mb-3 space-y-1">
          {warnings.map((warning, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              ⚠ {warning}
            </li>
          ))}
        </ul>
      )}

      <Accordion type="single" collapsible>
        {rows.map((row, rowIndex) => {
          const balance = rowBalances[rowIndex];
          const isBalanced = balance?.isBalanced ?? true;
          // Row has an issue if out of balance OR any non-zero field is missing a QB account name
          const nonZeroFields = DEPOSIT_FIELDS.filter((field) => row[field] !== 0);
          const hasMissingMappings = nonZeroFields.some((field) => !liveAccountMap[field]?.qbName);
          const hasIssue = !isBalanced || hasMissingMappings;

          return (
            <AccordionItem key={rowIndex} value={String(rowIndex)}>
              <AccordionTrigger>
                <span className={hasIssue ? "text-destructive" : "text-accent"}>
                  <DepositRowSummary row={row} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {!isBalanced && balance && (
                  <div className="bg-destructive/10 text-destructive rounded p-3 mb-3 text-sm">
                    <p className="font-medium mb-1">⚠ Journal does not balance.</p>
                    <p>
                      Total Debits: <Number isMoney decimals={2}>{balance.totalDebits}</Number>
                      {" | "}
                      Total Credits: <Number isMoney decimals={2}>{balance.totalCredits}</Number>
                      {" | "}
                      Delta: <Number isMoney decimals={2}>{Math.abs(balance.delta)}</Number>
                    </p>
                    <p className="mt-1 text-xs">Please contact admin with this information.</p>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead className="w-20">Acct #</TableHead>
                      <TableHead>QB Account</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Debits</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEPOSIT_FIELDS.filter((field) => row[field] !== 0).map((field) => {
                      const value = row[field];
                      const effectiveSide = getEffectiveSide(field, value);
                      const absValue = Math.abs(value);

                      return (
                        <TableRow key={field}>
                          <TableCell>{FIELD_LABELS[field]}</TableCell>
                          <TableCell>
                            <DepositAccountNumberCell field={field} />
                          </TableCell>
                          <TableCell>
                            <DepositAccountNameCell field={field} />
                          </TableCell>
                          <TableCell>
                            <DepositNameCell field={field} />
                          </TableCell>
                          <TableCell className="text-right">
                            {effectiveSide === "debit" ? (
                              <Number isMoney decimals={2}>{absValue}</Number>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            {effectiveSide === "credit" ? (
                              <Number isMoney decimals={2}>{absValue}</Number>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
