"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Badge, BadgeProps } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { Label } from "@/style/components/label";
import { Switch } from "@/style/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { SalesTaxMappingDialog } from "@/app/salesTax/salesTaxMapping/_components/SalesTaxMappingDialog";
import { salesTaxMappingSelect } from "@/app/salesTax/salesTaxMapping/salesTaxMappingSelect";
import { SalesTaxMappingStatus } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";

const STATUS_BADGES: Record<
  SalesTaxMappingStatus,
  { label: string; variant: BadgeProps["variant"]; intensity: BadgeProps["intensity"] }
> = {
  unmapped: { label: "Unmapped", variant: "outline", intensity: "ghost" },
  exempt: { label: "Exempt (0%)", variant: "outline", intensity: "soft" },
  match: { label: "Rates match", variant: "accent", intensity: "soft" },
  mismatch: { label: "Rates differ", variant: "secondary", intensity: "soft" },
  orphan: { label: "Not in RealGreen", variant: "destructive", intensity: "soft" },
};

/** The page is gated on the read capability by the layout; the Edit button needs write as well. */
export function SalesTaxMappingPanel() {
  const rows = useSelector(salesTaxMappingSelect.rows);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.salesTaxMappings.write);

  const [unmappedOnly, setUnmappedOnly] = useState(false);
  const [editingTaxCodeId, setEditingTaxCodeId] = useState<string | null>(null);

  const visibleRows = unmappedOnly ? rows.filter((row) => row.status === "unmapped") : rows;

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Each RealGreen tax code files under one or more Minnesota tax types.
          </p>
          <div className="flex items-center gap-2">
            <Switch id="unmappedOnly" checked={unmappedOnly} onCheckedChange={setUnmappedOnly} />
            <Label htmlFor="unmappedOnly">Unmapped only</Label>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Tax code</TableHead>
              <TableHead className="w-28">RealGreen rate</TableHead>
              <TableHead>Minnesota tax types</TableHead>
              <TableHead className="w-40">Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => {
              const badge = STATUS_BADGES[row.status];
              return (
                <TableRow key={row.taxCodeId}>
                  <TableCell className="font-mono">
                    {row.taxCodeId}
                    {row.taxCode && !row.taxCode.available && (
                      <span className="ml-2 text-xs text-muted-foreground">inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.taxCode ? `${row.taxCode.taxRate}%` : ""}
                  </TableCell>
                  <TableCell noTruncate>
                    <div className="flex flex-wrap gap-1">
                      {row.mnTaxTypes.map((mnTaxType) => (
                        <Badge
                          key={mnTaxType.code}
                          variant="primary"
                          intensity="soft"
                          title={`${mnTaxType.description} (${mnTaxType.ratePercent}%)`}
                        >
                          {mnTaxType.code}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell noTruncate>
                    <Badge variant={badge.variant} intensity={badge.intensity}>
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canWrite && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingTaxCodeId(row.taxCodeId)}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  {rows.length === 0 ? "No RealGreen tax codes loaded." : "Every tax code is mapped."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editingTaxCodeId !== null && (
        <SalesTaxMappingDialog
          key={editingTaxCodeId}
          taxCodeId={editingTaxCodeId}
          onCloseAction={() => setEditingTaxCodeId(null)}
        />
      )}
    </div>
  );
}
