import { useAppDispatch } from "@/lib/hooks/redux";
import { qboJournalEntryActions } from "@/app/qbo/journalEntry/qboJournalEntrySlice";
import {
  JournalEntryInput,
  JournalEntryRange,
} from "@/app/qbo/journalEntry/types/QboJournalEntryTypes";

/**
 * Exposes actions only. There is no autoLoad: posting and reconciling write to the real books and
 * a load needs a date range, so nothing happens until the user acts.
 */
export function useQboJournalEntry() {
  const dispatch = useAppDispatch();

  const postEntries = (entries: JournalEntryInput[]) =>
    dispatch(
      qboJournalEntryActions.postQboJournalEntries({
        params: { entries },
        config: { loadingMsg: "Posting journal entries to QuickBooks..." },
      }),
    );

  const reconcile = (docNumbers: string[]) =>
    dispatch(
      qboJournalEntryActions.reconcileQboJournalEntries({
        params: { docNumbers },
        config: { loadingMsg: "Checking journal entries in QuickBooks..." },
      }),
    );

  const loadRange = ({ startDate, endDate }: JournalEntryRange) =>
    dispatch(
      qboJournalEntryActions.getQboJournalEntryPostings({
        params: { startDate, endDate },
        config: { loadingMsg: "Loading journal entries..." },
      }),
    );

  const clearLastPostRun = () => dispatch(qboJournalEntryActions.clearLastPostRun());

  return { postEntries, reconcile, loadRange, clearLastPostRun };
}
