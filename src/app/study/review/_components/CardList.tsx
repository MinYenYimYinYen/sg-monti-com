"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Checkbox } from "@/style/components/checkbox";
import { Label } from "@/style/components/label";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { CardRow } from "@/app/study/review/_components/CardRow";
import { EditCardDialog } from "@/app/study/review/_components/EditCardDialog";
import type { StudyCardDoc } from "@/app/study/StudyTypes";
import { pruneSelection, splitPublishable, type ReviewTab } from "@/app/study/studyReviewLogic";
import { useStudyCards } from "@/app/study/useStudyCards";

/**
 * The cards of one tab, with the actions that make sense there. A selection is local: it is pruned to
 * what is on screen each render, so a card that moved to another tab is never acted on by mistake.
 */
export function CardList({
  tab,
  cards,
  activeCardKey,
  extraRowActions,
}: {
  tab: ReviewTab;
  cards: StudyCardDoc[];
  activeCardKey?: string | null;
  extraRowActions?: (card: StudyCardDoc) => React.ReactNode;
}) {
  const { acceptImageIdeas, publishCards, unpublishCards, deleteCards } = useStudyCards();
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.studyCardAdmin.write);
  const canDelete = allows(can.studyCardAdmin.delete);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editingCardKey, setEditingCardKey] = useState<string | null>(null);

  const selectedKeys = pruneSelection({ selected, visible: cards });
  const editingCard = cards.find((card) => card.cardKey === editingCardKey) ?? null;
  const { publishableKeys, blocked } = splitPublishable(cards.filter((card) => selectedKeys.includes(card.cardKey)));
  const hasSelection = selectedKeys.length > 0;

  function toggle(cardKey: string) {
    const next = new Set(selectedKeys);
    if (next.has(cardKey)) next.delete(cardKey);
    else next.add(cardKey);
    setSelected(next);
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(cards.map((card) => card.cardKey)) : new Set());
  }

  function runAndClear(action: (cardKeys: string[]) => void, cardKeys: string[]) {
    action(cardKeys);
    setSelected(new Set());
  }

  if (cards.length === 0) return <p className="p-3 text-sm text-muted-foreground">Nothing here.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`select-all-${tab}`}
            checked={hasSelection ? (selectedKeys.length === cards.length ? true : "indeterminate") : false}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
          <Label htmlFor={`select-all-${tab}`}>{hasSelection ? `${selectedKeys.length} selected` : "Select all"}</Label>
        </div>

        {tab === "ideas" && (
          <Button size="sm" disabled={!canWrite || !hasSelection} onClick={() => runAndClear(acceptImageIdeas, selectedKeys)}>
            Make picture cards
          </Button>
        )}
        {tab === "drafts" && (
          <Button
            size="sm"
            disabled={!canWrite || publishableKeys.length === 0}
            onClick={() => runAndClear(publishCards, publishableKeys)}
          >
            Publish {publishableKeys.length > 0 ? publishableKeys.length : ""}
          </Button>
        )}
        {tab === "published" && (
          <Button
            size="sm"
            variant="secondary"
            intensity="soft"
            disabled={!canWrite || !hasSelection}
            onClick={() => runAndClear(unpublishCards, selectedKeys)}
          >
            Back to drafts
          </Button>
        )}
        {tab !== "published" && (
          <Button
            size="sm"
            variant="destructive"
            intensity="soft"
            disabled={!canDelete || !hasSelection}
            onClick={() => runAndClear(deleteCards, selectedKeys)}
          >
            {tab === "ideas" ? "Dismiss" : "Delete"}
          </Button>
        )}
        {blocked.length > 0 && tab === "drafts" && (
          <span className="text-xs text-muted-foreground">{blocked.length} selected cannot be published yet.</span>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {cards.map((card) => (
          <CardRow
            key={card.cardKey}
            card={card}
            isSelected={selectedKeys.includes(card.cardKey)}
            isActive={card.cardKey === activeCardKey}
            onToggleAction={toggle}
            actions={
              <>
                {tab !== "published" && (
                  <Button
                    size="sm"
                    variant="primary"
                    intensity="ghost"
                    disabled={!canWrite}
                    onClick={() => setEditingCardKey(card.cardKey)}
                  >
                    Edit
                  </Button>
                )}
                {extraRowActions?.(card)}
              </>
            }
          />
        ))}
      </ul>

      {editingCard !== null && (
        <EditCardDialog key={editingCard.cardKey} card={editingCard} onCloseAction={() => setEditingCardKey(null)} />
      )}
    </div>
  );
}
