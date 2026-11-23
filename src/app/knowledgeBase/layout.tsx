"use client";

import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { LayoutPanelLeft, Settings } from "lucide-react";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { TabNav, type TabNavItem } from "@/components/PageLayout/TabNav";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { can } from "@/permission/can";
import { useKnowledgeBaseDeps } from "@/app/knowledgeBase/editor/useKnowledgeBaseDeps";
import { TopicFileControls } from "@/app/knowledgeBase/editor/_components/TopicFileControls";
import { TopicDetailFileControls } from "@/app/knowledgeBase/editor/_components/TopicDetailFileControls";
import { knowledgeBaseWorkspaceSelect } from "@/app/knowledgeBase/workspace/knowledgeBaseWorkspaceSelect";

const ROOT_HREF = "/knowledgeBase";
const WORKSPACE_HREF = "/knowledgeBase/workspace";
const SETTINGS_HREF = "/knowledgeBase/settings";

// Kept on purpose, with no tab and no link pointing at them. Each shows one entity on its own, which
// is what the workspace combines. If the way topics relate to documents changes, these are the simpler
// views to check a change against. They still work when opened by URL, so the header branch below
// stays, and so must anything they share with the workspace.
const TOPICS_HREF = "/knowledgeBase/topics";
const DOCUMENTS_HREF = "/knowledgeBase/documents";

const TABS: readonly TabNavItem[] = [
  { label: "Workspace", href: WORKSPACE_HREF, icon: LayoutPanelLeft },
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
  const editorTab = useSelector(knowledgeBaseWorkspaceSelect.editorTab);
  const isSettingsTab = pathname.startsWith(SETTINGS_HREF);
  const isWorkspace = pathname.startsWith(WORKSPACE_HREF);

  // The file menu acts on the draft in view. The workspace has two drafts, and its tab says which one
  // that is: the Approval tab shows the open document, so it shares the document's menu.
  const showsDocumentMenu = isWorkspace ? editorTab !== "topic" : pathname.startsWith(DOCUMENTS_HREF);
  const isUnlinkedTopicsRoute = pathname.startsWith(TOPICS_HREF);

  // The settings tab saves each section on its own, so it has no file menu.
  const headerControls = isSettingsTab ? null : showsDocumentMenu ? (
    <TopicDetailFileControls />
  ) : isWorkspace || isUnlinkedTopicsRoute ? (
    <TopicFileControls />
  ) : null;

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
