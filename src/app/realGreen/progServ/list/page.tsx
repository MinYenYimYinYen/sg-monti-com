"use client";

import React from "react";
import { ProgCodeViewer } from "@/app/realGreen/progServ/_components/ProgCodeViewer";
import { Container } from "@/components/Containers";
import { useProgServ } from "@/app/realGreen/progServ/useProgServ";

export default function ProgServListPage() {
  useProgServ({ autoLoad: true });

  return (
    <Container variant="page" title="Program & Service Codes">
      <div className="mb-6">
        <p className="text-text-muted">
          View and manage RealGreen program and service code definitions.
        </p>
      </div>
      <ProgCodeViewer />
    </Container>
  );
}
