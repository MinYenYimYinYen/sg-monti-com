"use client";

import { useSelector } from "react-redux";
import { askAwaySelect } from "@/app/askAway/askAwaySelect";
import { AskAwayDocumentBody } from "@/app/askAway/_components/AskAwayDocumentBody";
import { TopicKeyBadges } from "@/app/knowledgeBase/editor/_components/TopicKeyBadges";

/** The documents that apply to the topics marked so far, general to specific. */
export function AskAwayDocuments() {
  const details = useSelector(askAwaySelect.currentDetails);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <h2 className="shrink-0 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Documents in use
      </h2>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {details.length === 0 && (
          <p className="px-1 py-2 text-xs italic text-muted-foreground">
            Documents appear here when Claude marks a topic that has them.
          </p>
        )}
        {details.map((detail) => (
          <article key={detail.detailKey} className="space-y-2 rounded-md border border-border bg-card p-3">
            <header className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">{detail.title}</h3>
              <TopicKeyBadges topicKeys={detail.topicKeys} />
            </header>
            <AskAwayDocumentBody key={`${detail.detailKey}|${detail.updatedAt}`} contentHtml={detail.contentHtml} />
          </article>
        ))}
      </div>
    </div>
  );
}
