"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { importCCTxnMappingSelect } from "@/app/qbo/importCCTxn/importCCTxnMappingSelect";
import { useImportCCTxnMapping } from "@/app/qbo/importCCTxn/useImportCCTxnMapping";
import { ImportFormatId } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

/**
 * Assigns one card in the file to a responsible site user. Reads its own data and saves through
 * the mapping hook, so the parent only passes the card's identity. Key it on formatId + last4.
 */
export function CardAssignmentRow({
  formatId,
  last4,
  rowCount,
}: {
  formatId: ImportFormatId;
  last4: string;
  rowCount: number;
}) {
  const assignableUsers = useSelector(importCCTxnMappingSelect.assignableUsers);
  const canAssign = useSelector(userCapabilitiesSelect.allows)(
    can.ccCardAssignments.write,
  );
  const { saveCardAssignment } = useImportCCTxnMapping({ autoLoad: false });

  const [userName, setUserName] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  const handleSave = () => {
    saveCardAssignment({
      formatId,
      last4,
      userName,
      ...(cardholderName.trim() ? { cardholderName: cardholderName.trim() } : {}),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-3">
      <div className="min-w-24">
        <div className="font-mono text-sm font-semibold text-foreground">•••• {last4}</div>
        <div className="text-xs text-muted-foreground">
          {rowCount} transaction{rowCount === 1 ? "" : "s"}
        </div>
      </div>

      <Select value={userName} onValueChange={setUserName}>
        <SelectTrigger className="min-w-48">
          <SelectValue placeholder="Responsible user" />
        </SelectTrigger>
        <SelectContent>
          {assignableUsers.map((user) => (
            <SelectItem key={user.userName} value={user.userName}>
              {user.firstName} {user.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        className="max-w-56"
        placeholder="Cardholder name (optional)"
        value={cardholderName}
        onChange={(event) => setCardholderName(event.target.value)}
      />

      <Button variant="primary" disabled={!canAssign || !userName} onClick={handleSave}>
        Save
      </Button>
    </div>
  );
}
