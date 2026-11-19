"use client";

import { X } from "lucide-react";
import { useSelector } from "react-redux";
import { Badge } from "@/style/components/badge";
import { Button } from "@/style/components/button";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { MnTaxTypePickerPopover } from "@/app/salesTax/stateTaxRevenueGroups/_components/MnTaxTypePickerPopover";
import { formatMnTaxCodes } from "@/app/salesTax/stateTaxRevenueGroups/_lib/revenueGroupLogic";
import { stateTaxRevenueGroupSelect } from "@/app/salesTax/stateTaxRevenueGroups/stateTaxRevenueGroupSelect";
import { useStateTaxRevenueGroup } from "@/app/salesTax/stateTaxRevenueGroups/useStateTaxRevenueGroup";

/** One revenue group: its member tax types, each removable, and a picker to add another. */
export function RevenueGroupCard({ revenueGroupKey }: { revenueGroupKey: string }) {
  const group = useSelector(stateTaxRevenueGroupSelect.groupByKey).get(revenueGroupKey);
  const ungroupedMnTaxTypes = useSelector(stateTaxRevenueGroupSelect.ungroupedMnTaxTypes);
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.salesTaxMappings.write);
  const canDelete = allows(can.salesTaxMappings.delete);
  const { joinGroup, leaveGroup } = useStateTaxRevenueGroup({ autoLoad: false });

  if (!group) return null;

  const isSingleMember = group.members.length < 2;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <p className="font-mono text-sm font-semibold">
          {formatMnTaxCodes(group.members.map((member) => member.mnTaxCode))}
        </p>
        {isSingleMember && (
          <Badge variant="secondary" intensity="soft">
            Needs another tax type
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {group.members.map((member) => (
          <Badge
            key={member.mnTaxCode}
            variant="primary"
            intensity="soft"
            className="gap-1.5"
            title={
              member.mnTaxType
                ? `${member.mnTaxType.description} (${member.mnTaxType.ratePercent}%)`
                : "No saved mapping defines this tax type any more"
            }
          >
            <span className="font-mono">{member.mnTaxCode}</span>
            <span>{member.mnTaxType?.description ?? "Unknown tax type"}</span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-4 w-4"
              disabled={!canDelete}
              onClick={() => leaveGroup({ mnTaxCode: member.mnTaxCode })}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {member.mnTaxCode} from the group</span>
            </Button>
          </Badge>
        ))}
      </div>

      <div>
        <MnTaxTypePickerPopover
          label="Add tax type"
          mnTaxTypes={ungroupedMnTaxTypes}
          disabled={!canWrite}
          onPickAction={(mnTaxType) => joinGroup({ mnTaxCode: mnTaxType.code, revenueGroupKey })}
        />
      </div>
    </div>
  );
}
