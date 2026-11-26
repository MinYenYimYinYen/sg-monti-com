import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { STUDY_STALE_MS } from "@/app/study/studyConst";
import { studyCardActions } from "@/app/study/studyCardSlice";
import type { ReviewOutcome } from "@/app/study/StudyTypes";

/** Loads the decks that have published cards. Call it once, in the screen that owns the page. */
export function useStudyDeckList() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      studyCardActions.getStudyDecks({
        params: {},
        config: { loadingMsg: "Loading decks...", staleTime: STUDY_STALE_MS },
      }),
    );
  }, [dispatch]);
}

/** Loads one deck's published cards and this user's progress on them. Mount it with a `key` of the deck. */
export function useStudyDeck(deckKey: string) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      studyCardActions.getPublishedCards({
        params: { deckKey },
        config: { loadingMsg: "Loading cards...", staleTime: STUDY_STALE_MS },
      }),
    );
    // Progress is never cached: it changes with every answer, and a stale schedule would show a card
    // as due that the student already answered on another device.
    dispatch(
      studyCardActions.getMyReviews({
        params: { deckKey },
        config: { loadingMsg: "Loading your progress...", force: true },
      }),
    );
  }, [dispatch, deckKey]);

  /** Resolves when the answer is saved, so the screen can stay disabled until then and cannot double submit. */
  function submitReview({ cardKey, outcome }: { cardKey: string; outcome: ReviewOutcome }) {
    return dispatch(studyCardActions.submitReview({ params: { cardKey, outcome }, config: { showLoading: false } }));
  }

  return { submitReview };
}
