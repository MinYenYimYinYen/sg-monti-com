"use client";

import { usePathname } from "next/navigation";
import { FileText, Tags } from "lucide-react";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";
import { useKnowledgeBaseDeps } from "@/app/knowledgeBase/editor/useKnowledgeBaseDeps";
import { TopicFileControls } from "@/app/knowledgeBase/editor/_components/TopicFileControls";
import { TopicDetailFileControls } from "@/app/knowledgeBase/editor/_components/TopicDetailFileControls";

const ROOT_HREF = "/knowledgeBase";
const TOPICS_HREF = "/knowledgeBase/topics";
const DOCUMENTS_HREF = "/knowledgeBase/documents";

const TABS: readonly TabNavItem[] = [
  { label: "Topics", href: TOPICS_HREF, icon: Tags },
  { label: "Documents", href: DOCUMENTS_HREF, icon: FileText },
];

export default function KnowledgeBaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatedPanel requirement={can.knowledgeTopics.read}>
      <KnowledgeBaseShell>{children}</KnowledgeBaseShell>
    </GatedPanel>
  );
}

// Separate from the gate so the deps hook is only ever called for a user who holds the read.
function KnowledgeBaseShell({ children }: { children: React.ReactNode }) {
  useKnowledgeBaseDeps({ canLoad: true });
  const pathname = usePathname();
  const isDocumentsTab = pathname.startsWith(DOCUMENTS_HREF);

  return (
    <PageLayout>
      <PageLayout.Header
        left={isDocumentsTab ? <TopicDetailFileControls /> : <TopicFileControls />}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
