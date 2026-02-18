"use client";

import React from "react";
import { GlobalSettingsForm } from "@/app/globalSettings/_lib/components/GlobalSettingsForm";
import { Container } from "@/components/Containers";

export default function GlobalSettingsPage() {
  return (
    <Container variant={"page"}>
      <GlobalSettingsForm />
    </Container>
  );
}
