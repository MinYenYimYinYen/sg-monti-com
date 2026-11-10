import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CkDepositRow, DepositRow, GenLedgerFileInput } from "@/app/javelin/JavelinTypes";
import { javelinActions } from "@/app/javelin/javelinSlice";

/**
 * Exposes actions only. Previews write nothing. A post writes to the real books, so nothing
 * posts until the user acts, and a post is followed by a fresh "latest" so the banner is current.
 */
export function useJavelin({ autoLoad }: { autoLoad: boolean }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (autoLoad) {
      dispatch(
        javelinActions.getJavelinLatest({
          params: {},
          config: { showLoading: false, staleTime: 60 * 1000 },
        }),
      );
    }
  }, [autoLoad, dispatch]);

  const refreshLatest = () =>
    dispatch(
      javelinActions.getJavelinLatest({ params: {}, config: { showLoading: false, force: true } }),
    );

  const previewGenLedger = ({
    files,
    confirmedDocNumbers,
  }: {
    files: GenLedgerFileInput[];
    confirmedDocNumbers: string[];
  }) =>
    dispatch(
      javelinActions.previewGenLedger({
        params: { files, confirmedDocNumbers },
        config: { loadingMsg: "Checking entries..." },
      }),
    );

  const previewDeposits = ({
    rows,
    fileName,
    confirmedDocNumbers,
  }: {
    rows: DepositRow[];
    fileName: string;
    confirmedDocNumbers: string[];
  }) =>
    dispatch(
      javelinActions.previewDeposits({
        params: { rows, fileName, confirmedDocNumbers },
        config: { loadingMsg: "Checking entries..." },
      }),
    );

  const postGenLedger = async ({
    files,
    confirmedDocNumbers,
  }: {
    files: GenLedgerFileInput[];
    confirmedDocNumbers: string[];
  }) => {
    await dispatch(
      javelinActions.postGenLedger({
        params: { files, confirmedDocNumbers },
        config: { loadingMsg: "Posting journal entries to QuickBooks..." },
      }),
    );
    // Whatever happened, the plan and the banner are now out of date.
    await previewGenLedger({ files, confirmedDocNumbers: [] });
    await refreshLatest();
  };

  const postDeposits = async ({
    rows,
    fileName,
    confirmedDocNumbers,
  }: {
    rows: DepositRow[];
    fileName: string;
    confirmedDocNumbers: string[];
  }) => {
    await dispatch(
      javelinActions.postDeposits({
        params: { rows, fileName, confirmedDocNumbers },
        config: { loadingMsg: "Posting journal entries to QuickBooks..." },
      }),
    );
    await previewDeposits({ rows, fileName, confirmedDocNumbers: [] });
    await refreshLatest();
  };

  const previewCkDeposits = ({
    rows,
    confirmedDocNumbers,
  }: {
    rows: CkDepositRow[];
    confirmedDocNumbers: string[];
  }) =>
    dispatch(
      javelinActions.previewCkDeposits({
        params: { rows, confirmedDocNumbers },
        config: { loadingMsg: "Checking entries..." },
      }),
    );

  const postCkDeposits = async ({
    rows,
    confirmedDocNumbers,
  }: {
    rows: CkDepositRow[];
    confirmedDocNumbers: string[];
  }) => {
    // The slice drops the rows that posted, so only the banner needs refreshing afterwards.
    await dispatch(
      javelinActions.postCkDeposits({
        params: { rows, confirmedDocNumbers },
        config: { loadingMsg: "Posting journal entries to QuickBooks..." },
      }),
    );
    await refreshLatest();
  };

  return {
    refreshLatest,
    previewGenLedger,
    previewDeposits,
    postGenLedger,
    postDeposits,
    previewCkDeposits,
    postCkDeposits,
  };
}
