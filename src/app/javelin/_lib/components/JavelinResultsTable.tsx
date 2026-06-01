"use client";
import { useSelector } from "react-redux";
import { javelinSelect } from "@/app/javelin/javelinSelect";
import { Number } from "@/components/Number";
import { AccountNameCell } from "@/app/javelin/_lib/components/AccountNameCell";
import { AccountNumberCell } from "@/app/javelin/_lib/components/AccountNumberCell";
import { NameCell } from "@/app/javelin/_lib/components/NameCell";
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

export function JavelinResultsTable() {
  const files = useSelector(javelinSelect.files);
  const liveAccountMap = useSelector(javelinSelect.liveAccountMap);

  if (files.length === 0) {
    return null;
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="mt-6"
    >
      {files.map((file) => {
        const hasIssues =
          file.errors.length > 0 ||
          file.warnings.length > 0 ||
          file.rows.some((row) => !liveAccountMap?.[row.account]?.qbName);

        return (
          <AccordionItem key={file.fileName} value={file.fileName}>
            <AccordionTrigger>
              <span className={hasIssues ? "text-destructive" : "text-accent"}>
                {file.date || file.fileName}
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({file.fileName})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {file.errors.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {file.errors.map((error, i) => (
                    <li key={i} className="text-sm text-destructive">
                      {error}
                    </li>
                  ))}
                </ul>
              )}

              {file.warnings.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {file.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      ⚠ {warning}
                    </li>
                  ))}
                </ul>
              )}

              {file.errors.length === 0 && file.rows.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CRM Account</TableHead>
                      <TableHead className="w-20">Acct #</TableHead>
                      <TableHead className="w-64">QB Account</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Debits</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {file.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        <TableCell>{row.account}</TableCell>
                        <TableCell>
                          <AccountNumberCell crmName={row.account} />
                        </TableCell>
                        <TableCell>
                          <AccountNameCell crmName={row.account} />
                        </TableCell>
                        <TableCell>
                          <NameCell crmName={row.account} />
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalNetAmount > 0 ? (
                            <Number isMoney decimals={2}>
                              {row.totalNetAmount}
                            </Number>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.totalNetAmount < 0 ? (
                            <Number isMoney decimals={2}>
                              {Math.abs(row.totalNetAmount)}
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
