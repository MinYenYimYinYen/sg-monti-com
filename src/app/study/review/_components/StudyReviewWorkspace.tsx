"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { Notice } from "@/app/permission/_components/Notice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/style/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/style/components/tabs";
import { CardList } from "@/app/study/review/_components/CardList";
import { DraftPictureActions } from "@/app/study/review/_components/DraftPictureActions";
import { PicturePanel } from "@/app/study/review/_components/PicturePanel";
import { cardsForTab, parseReviewTab, REVIEW_TABS, type ReviewTab } from "@/app/study/studyReviewLogic";
import { studyCardSelect } from "@/app/study/studyCardSelect";
import { studySelect } from "@/app/study/studySelect";
import { useStudyCards } from "@/app/study/useStudyCards";
import { useStudyDecks } from "@/app/study/useStudyImport";

const NO_CARDS: never[] = [];

/** Review what an import produced: decide on picture ideas, add pictures, fix drafts, then publish. */
export function StudyReviewWorkspace() {
  useStudyDecks();
  const { loadCards, reloadCards } = useStudyCards();
  const decks = useSelector(studySelect.decks);
  const cardsByDeckKey = useSelector(studyCardSelect.cardsByDeckKey);
  const countsByDeckKey = useSelector(studyCardSelect.cardCountsByDeckKey);
  const [deckKey, setDeckKey] = useState<string | null>(null);
  const [tab, setTab] = useState<ReviewTab>("drafts");

  const cards = deckKey === null ? NO_CARDS : (cardsByDeckKey.get(deckKey) ?? NO_CARDS);
  const counts = deckKey === null ? null : countsByDeckKey.get(deckKey);

  // Loaded when the admin picks a deck, not in an effect: nothing here reacts to a render.
  function handleSelectDeck(selectedDeckKey: string) {
    setDeckKey(selectedDeckKey);
    loadCards(selectedDeckKey);
  }

  function countOf(reviewTab: ReviewTab): number {
    if (!counts) return 0;
    if (reviewTab === "ideas") return counts.proposed;
    if (reviewTab === "needsPicture") return counts.needsPicture;
    if (reviewTab === "drafts") return counts.draft;
    return counts.published;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border bg-card p-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Review cards</h1>
          <Select value={deckKey ?? ""} onValueChange={handleSelectDeck}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Choose a deck" />
            </SelectTrigger>
            <SelectContent>
              {decks.map((deck) => (
                <SelectItem key={deck.deckKey} value={deck.deckKey}>
                  {deck.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {deckKey !== null && (
            <button type="button" className="text-sm text-primary underline" onClick={() => reloadCards(deckKey)}>
              Reload
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 p-6">
          {deckKey === null ? (
            <Notice>Choose a deck to see its cards.</Notice>
          ) : (
            <Tabs value={tab} onValueChange={(value) => setTab(parseReviewTab(value))} className="flex-none">
              <TabsList className="h-auto flex-wrap">
                {REVIEW_TABS.map((entry) => (
                  <TabsTrigger key={entry.tab} value={entry.tab}>
                    {entry.label} ({countOf(entry.tab)})
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="ideas" className="flex-none">
                <CardList tab="ideas" cards={cardsForTab({ cards, tab: "ideas" })} />
              </TabsContent>
              <TabsContent value="needsPicture" className="flex-none">
                <PicturePanel cards={cardsForTab({ cards, tab: "needsPicture" })} />
              </TabsContent>
              <TabsContent value="drafts" className="flex-none">
                <CardList
                  tab="drafts"
                  cards={cardsForTab({ cards, tab: "drafts" })}
                  extraRowActions={(card) => <DraftPictureActions card={card} />}
                />
              </TabsContent>
              <TabsContent value="published" className="flex-none">
                <CardList tab="published" cards={cardsForTab({ cards, tab: "published" })} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
