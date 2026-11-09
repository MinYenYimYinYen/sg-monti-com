"use client";
import { Badge } from "@/style/components/badge";
import { Checkbox } from "@/style/components/checkbox";
import { Number } from "@/components/Number";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/style/components/table";
import { JavelinPlanEntry, JavelinPlanStatus } from "@/app/javelin/JavelinTypes";

type StatusDisplay = {
  label: string;
  variant: "accent" | "primary" | "destructive" | "secondary";
  intensity: "soft" | "ghost" | "solid";
};

const statusDisplay: Record<JavelinPlanStatus, StatusDisplay> = {
  ready: { label: "Ready", variant: "accent", intensity: "soft" },
  duplicate: { label: "Already posted", variant: "primary", intensity: "ghost" },
  possibleDuplicate: { label: "Possible duplicate", variant: "secondary", intensity: "soft" },
  blocked: { label: "Blocked", variant: "destructive", intensity: "soft" },
  empty: { label: "Nothing to post", variant: "primary", intensity: "ghost" },
};

/**
 * One row per file or deposit. Shows what the server decided and why. A possible duplicate
 * carries a checkbox: it posts only when the user confirms it is a genuinely separate entry.
 */
export function PlanEntryList({
  plan,
  confirmedDocNumbers,
  toggleConfirmedAction,
}: {
  plan: JavelinPlanEntry[];
  confirmedDocNumbers: string[];
  toggleConfirmedAction: (docNumber: string) => void;
}) {
  if (plan.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="mt-6">
      {plan.map((entry, index) => {
        const display = statusDisplay[entry.status];
        return (
          <AccordionItem key={`${entry.label}:${index}`} value={`${entry.label}:${index}`}>
            <AccordionTrigger>
              <span className="flex items-center gap-3">
                <span>{entry.label}</span>
                <Badge variant={display.variant} intensity={display.intensity}>
                  {display.label}
                </Badge>
                {entry.totalCents > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    <Number isMoney decimals={2}>
                      {entry.totalCents / 100}
                    </Number>
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {entry.problems.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {entry.problems.map((problem) => (
                    <li key={problem} className="text-sm text-destructive">
                      {problem}
                    </li>
                  ))}
                </ul>
              )}

              {entry.status === "possibleDuplicate" && entry.docNumber && (
                <label className="mb-3 flex items-start gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={confirmedDocNumbers.includes(entry.docNumber)}
                    onCheckedChange={() => toggleConfirmedAction(entry.docNumber!)}
                  />
                  <span>
                    An entry for this date was already posted ({entry.matchedDocNumber}) with
                    different content. Post this one as well.
                  </span>
                </label>
              )}

              {entry.lines.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>QuickBooks account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debits</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.lines.map((line, lineIndex) => (
                      <TableRow key={lineIndex}>
                        <TableCell>{line.accountName}</TableCell>
                        <TableCell>{line.description ?? ""}</TableCell>
                        <TableCell className="text-right">
                          {line.postingType === "Debit" ? (
                            <Number isMoney decimals={2}>
                              {line.amountCents / 100}
                            </Number>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.postingType === "Credit" ? (
                            <Number isMoney decimals={2}>
                              {line.amountCents / 100}
                            </Number>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
