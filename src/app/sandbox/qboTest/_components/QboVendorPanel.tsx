"use client";

import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { qboVendorSelect } from "@/app/qbo/vendor/qboVendorSelect";
import { useQboVendor } from "@/app/qbo/vendor/useQboVendor";

export function QboVendorPanel() {
  const vendors = useSelector(qboVendorSelect.vendors);
  const activeVendors = useSelector(qboVendorSelect.activeVendors);
  // The layout already loads vendors. autoLoad is off here so this only supplies refresh.
  const { refresh } = useQboVendor({ autoLoad: false });

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {vendors.length} vendors, {activeVendors.length} active. Read from QuickBooks this
            session. Only the name, company, status and Id reach the browser.
          </p>
          <Button variant="primary" intensity="soft" onClick={refresh}>
            Reload from QuickBooks
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Display name</TableHead>
              <TableHead className="w-[32%]">Company</TableHead>
              <TableHead className="w-[16%]">Status</TableHead>
              <TableHead className="w-[12%]">Id</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.Id} variant="alternating">
                <TableCell>{vendor.DisplayName}</TableCell>
                <TableCell>{vendor.CompanyName ?? ""}</TableCell>
                <TableCell noTruncate>
                  <Badge
                    variant={vendor.Active ? "accent" : "destructive"}
                    intensity={vendor.Active ? "soft" : "ghost"}
                  >
                    {vendor.Active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{vendor.Id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
