"use client";

import { useSelector } from "react-redux";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { MnTaxTypePickerPopover } from "@/app/salesTax/stateTaxRevenueGroups/_components/MnTaxTypePickerPopover";
import { RevenueGroupCard } from "@/app/salesTax/stateTaxRevenueGroups/_components/RevenueGroupCard";
import { stateTaxRevenueGroupSelect } from "@/app/salesTax/stateTaxRevenueGroups/stateTaxRevenueGroupSelect";
import { useStateTaxRevenueGroup } from "@/app/salesTax/stateTaxRevenueGroups/useStateTaxRevenueGroup";

/** The page is gated on the mapping read by the layout; changing groups needs write and delete. */
export function StateTaxRevenueGroupsPanel() {
  const groups = useSelector(stateTaxRevenueGroupSelect.groups);
  const ungroupedMnTaxTypes = useSelector(stateTaxRevenueGroupSelect.ungroupedMnTaxTypes);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.salesTaxMappings.write);
  const { createGroup } = useStateTaxRevenueGroup({ autoLoad: false });

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            The state requires the Minnesota tax types in a group to report identical revenue. The
            sales tax report warns when a month&apos;s revenue differs, and lists the customers to check.
          </p>
          <MnTaxTypePickerPopover
            label="New group"
            mnTaxTypes={ungroupedMnTaxTypes}
            disabled={!canWrite}
            onPickAction={(mnTaxType) => createGroup({ mnTaxCode: mnTaxType.code })}
          />
        </div>

        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No revenue groups yet. Only Minnesota tax types used by a saved mapping can be grouped.
          </p>
        )}
        {groups.map((group) => (
          <RevenueGroupCard key={group.revenueGroupKey} revenueGroupKey={group.revenueGroupKey} />
        ))}
      </div>
    </div>
  );
}
