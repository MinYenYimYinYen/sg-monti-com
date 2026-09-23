"use client";

import { PageLayout } from "@/components/PageLayout/PageLayout";

export default function CallLogLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageLayout>
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
