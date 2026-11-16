"use client";

import { Container } from "@/components/Containers";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";

export default function KnowledgeBasePage() {
  return (
    <GatedPanel requirement={can.knowledgeTopics.read}>
      <Container variant="scroll-shell" title="Knowledge Base">
        <p className="text-sm text-muted-foreground">Topics and documents will be managed here.</p>
      </Container>
    </GatedPanel>
  );
}
