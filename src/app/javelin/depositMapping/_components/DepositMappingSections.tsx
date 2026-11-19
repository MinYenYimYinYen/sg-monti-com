"use client";

import { useSelector } from "react-redux";
import { Notice } from "@/app/permission/_components/Notice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { CkDepositMappingSection } from "@/app/javelin/depositMapping/_components/CkDepositMappingSection";
import { DepositFieldMappingSection } from "@/app/javelin/depositMapping/_components/DepositFieldMappingSection";
import { SalesTaxMappingSection } from "@/app/javelin/depositMapping/_components/SalesTaxMappingSection";
import { can } from "@/permission/can";

/**
 * The deposit link sections shown on the account mapping page, plus the sales tax payment accounts
 * that are stored with them. They are separate data from the account links, so a user can hold one
 * without the other. Without the read capability the data is never loaded, so this says why the
 * sections are missing instead of showing empty pickers. The server refuses the data either way.
 */
export function DepositMappingSections() {
  const allows = useSelector(userCapabilitiesSelect.allows);

  if (!allows(can.depositFieldLinks.read)) {
    return <Notice>You do not have access to the deposit account links.</Notice>;
  }
  return (
    <>
      <DepositFieldMappingSection />
      <CkDepositMappingSection />
      <SalesTaxMappingSection />
    </>
  );
}
