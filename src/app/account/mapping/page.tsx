"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";
import { AccountMappingPanel } from "@/app/account/_components/AccountMappingPanel";

export default function AccountMappingPage() {
  return (
    <PageLayout>
      <PageLayout.Header left={<span className="text-sm font-semibold">Account Mapping</span>} />
      <PageLayout.Body>
        <AccountMappingPanel />
      </PageLayout.Body>
    </PageLayout>
  );
}
