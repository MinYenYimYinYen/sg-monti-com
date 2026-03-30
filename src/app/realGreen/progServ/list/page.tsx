"use client";

import React from "react";
import { ProgCodeViewer } from "@/app/realGreen/progServ/_lib/components/ProgCodeViewer";
import { Container } from "@/components/Containers";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";

export default function ProgServListPage() {
  useProgServ({ autoLoad: true });

  //todo: Make this UI like the product, appmethod, or equipment ui configs
  //todo: Enable editing the rule
  //todo: We should be setting the default here, and allowing for multiple other possibilities
  //todo: Loadout form should be allowed to choose from the other possibilities.
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
