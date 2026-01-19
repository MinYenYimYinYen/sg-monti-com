"use client";

import React from "react";
import { ProgCodeViewer } from "@/app/realGreen/progServMeta/components/ProgCodeViewer";
import { PageContainer } from "@/style/components/Containers";
import { useProgServMeta } from "@/app/realGreen/progServMeta/useProgServMeta";

export default function ProgServMetaListPage() {
  useProgServMeta({ autoLoad: true });

  return (
    <PageContainer title="Program & Service Codes">
      <div className="mb-6">
        <p className="text-text-muted">
          View and manage RealGreen program and service code definitions.
        </p>
      </div>
      <ProgCodeViewer />
    </PageContainer>
  );
}
