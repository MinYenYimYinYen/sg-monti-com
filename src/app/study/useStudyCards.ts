import { useAppDispatch } from "@/lib/hooks/redux";
import type { CardEdit } from "@/app/study/StudyApiTypes";
import { STUDY_STALE_MS } from "@/app/study/studyConst";
import { studyCardActions } from "@/app/study/studyCardSlice";

/** Actions for the review screen. Read the cards with `studyCardSelect`. */
export function useStudyCards() {
  const dispatch = useAppDispatch();

  function loadCards(deckKey: string) {
    dispatch(
      studyCardActions.getCards({
        params: { deckKey },
        config: { loadingMsg: "Loading cards...", staleTime: STUDY_STALE_MS },
      }),
    );
  }

  /** After a run, so the new drafts show. A refresh the admin asked for, so it forces past the cache. */
  function reloadCards(deckKey: string) {
    dispatch(studyCardActions.getCards({ params: { deckKey }, config: { loadingMsg: "Loading cards...", force: true } }));
  }

  function editCard({ cardKey, edit }: { cardKey: string; edit: CardEdit }) {
    dispatch(
      studyCardActions.editCard({
        params: { cardKey, edit },
        config: { loadingMsg: "Saving card...", successMsg: "Card saved." },
      }),
    );
  }

  function acceptImageIdeas(cardKeys: string[]) {
    dispatch(studyCardActions.acceptImageIdeas({ params: { cardKeys }, config: { loadingMsg: "Accepting..." } }));
  }

  function publishCards(cardKeys: string[]) {
    dispatch(
      studyCardActions.publishCards({
        params: { cardKeys },
        config: { loadingMsg: "Publishing...", successMsg: "Published." },
      }),
    );
  }

  function unpublishCards(cardKeys: string[]) {
    dispatch(
      studyCardActions.unpublishCards({
        params: { cardKeys },
        config: { loadingMsg: "Taking back...", successMsg: "Back to drafts." },
      }),
    );
  }

  function deleteCards(cardKeys: string[]) {
    dispatch(
      studyCardActions.deleteCards({
        params: { cardKeys },
        config: { loadingMsg: "Deleting...", successMsg: "Deleted." },
      }),
    );
  }

  function removeFigure(cardKey: string) {
    dispatch(studyCardActions.removeFigure({ params: { cardKey }, config: { loadingMsg: "Removing picture..." } }));
  }

  /** Quiet: attaching is part of a paste-and-move-on rhythm, so it takes no spinner and no toast. */
  function attachFigure(params: { cardKey: string; dataBase64: string; widthPx: number; heightPx: number }) {
    return dispatch(studyCardActions.attachFigure({ params, config: { showLoading: false } }));
  }

  return {
    loadCards,
    reloadCards,
    editCard,
    acceptImageIdeas,
    publishCards,
    unpublishCards,
    deleteCards,
    removeFigure,
    attachFigure,
  };
}
