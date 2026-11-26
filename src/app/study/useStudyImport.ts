import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { STUDY_STALE_MS } from "@/app/study/studyConst";
import { resumeStudyImport, startStudyImport } from "@/app/study/studyImportThunks";
import { studyActions } from "@/app/study/studySlice";

/** Loads the deck list. Call it once, in the screen that owns the page. */
export function useStudyDecks() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      studyActions.getDecks({
        params: {},
        config: { loadingMsg: "Loading decks...", staleTime: STUDY_STALE_MS },
      }),
    );
  }, [dispatch]);
}

/** The actions that import a PDF. Read the state with `studySelect`. */
export function useStudyImport() {
  const dispatch = useAppDispatch();

  function loadImports(deckKey: string) {
    dispatch(
      studyActions.getImports({
        params: { deckKey },
        config: { loadingMsg: "Loading imports...", staleTime: STUDY_STALE_MS },
      }),
    );
  }

  function createDeck({ title, examName }: { title: string; examName: string }) {
    dispatch(
      studyActions.createDeck({
        params: { title, examName },
        config: { loadingMsg: "Creating deck...", successMsg: "Deck created." },
      }),
    );
  }

  // A run is long and shows its own progress from the store, so it takes no spinner.
  function startImport({ deckKey, file }: { deckKey: string; file: File }) {
    void dispatch(startStudyImport({ deckKey, file }));
  }

  function resumeImport({ importId, file }: { importId: string; file: File }) {
    void dispatch(resumeStudyImport({ importId, file }));
  }

  function stopImport() {
    dispatch(studyActions.stopRequested());
  }

  function clearRunMessage() {
    dispatch(studyActions.runMessageCleared());
  }

  return { loadImports, createDeck, startImport, resumeImport, stopImport, clearRunMessage };
}
