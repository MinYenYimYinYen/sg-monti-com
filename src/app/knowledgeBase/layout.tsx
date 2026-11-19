"use client";

import { usePathname } from "next/navigation";
import { FileText, Settings, Tags } from "lucide-react";
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
const SETTINGS_HREF = "/knowledgeBase/settings";

const TABS: readonly TabNavItem[] = [
  { label: "Topics", href: TOPICS_HREF, icon: Tags },
  { label: "Documents", href: DOCUMENTS_HREF, icon: FileText },
  { label: "Settings", href: SETTINGS_HREF, icon: Settings },
];

// Two gates because the editor reads the topics and documents, and the approver list in the settings,
// and a gate takes one capability.
export default function KnowledgeBaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatedPanel requirement={can.knowledgeTopics.read}>
      <GatedPanel requirement={can.knowledgeSettings.read}>
        <KnowledgeBaseShell>{children}</KnowledgeBaseShell>
      </GatedPanel>
    </GatedPanel>
  );
}

// Separate from the gates so the deps hook is only ever called for a user who holds both reads.
function KnowledgeBaseShell({ children }: { children: React.ReactNode }) {
  useKnowledgeBaseDeps();
  const pathname = usePathname();
  const isDocumentsTab = pathname.startsWith(DOCUMENTS_HREF);
  const isSettingsTab = pathname.startsWith(SETTINGS_HREF);

  // The settings tab saves each section on its own, so it has no file menu.
  const headerControls = isSettingsTab ? null : isDocumentsTab ? <TopicDetailFileControls /> : <TopicFileControls />;

  return (
    <PageLayout>
      <PageLayout.Header
        left={headerControls}
        right={<TabNav items={TABS} rootHref={ROOT_HREF} />}
      />
      <PageLayout.Body>{children}</PageLayout.Body>
    </PageLayout>
  );
}
