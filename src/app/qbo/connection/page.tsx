"use client";

import { Suspense } from "react";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { QboConnectionPanel } from "@/app/qbo/connection/_components/QboConnectionPanel";

// useSearchParams (used by the panel to read the OAuth callback result) needs a Suspense boundary.
export default function QboConnectionPage() {
  return (
    <PageLayout>
      <PageLayout.Header left={<span className="text-sm font-semibold">QuickBooks Connection</span>} />
      <PageLayout.Body>
        <Suspense fallback={null}>
          <QboConnectionPanel />
        </Suspense>
      </PageLayout.Body>
    </PageLayout>
  );
}
