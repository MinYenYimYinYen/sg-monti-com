import { useAppDispatch } from "@/lib/hooks/redux";
import { importPostActions } from "@/app/qbo/importCCTxn/post/importPostSlice";
import { importRowActions } from "@/app/qbo/importCCTxn/rows/importRowSlice";
import { importCCTxnMappingActions } from "@/app/qbo/importCCTxn/importCCTxnMappingSlice";

/** Actions for posting. The preview and results are read with useSelector(importPostSelect...). */
export function useImportPost() {
  const dispatch = useAppDispatch();

  // Posting can add an account to a merchant's other accounts on the server. Reloading the
  // mappings keeps the browser's copy current, so a later edit on the Map tab cannot save a
  // stale list over it.
  const reloadMerchantMappings = () =>
    dispatch(
      importCCTxnMappingActions.getMerchantMappings({
        params: {},
        config: { force: true, showLoading: false },
      }),
    );

  const previewPost = (rowId: string) =>
    dispatch(
      importPostActions.previewPost({
        params: { rowId },
        config: { force: true, loadingMsg: "Checking the row against QuickBooks..." },
      }),
    );

  const previewBatch = ({ startDate, endDate }: { startDate: string; endDate: string }) =>
    dispatch(
      importPostActions.previewBatch({
        params: { startDate, endDate },
        config: { force: true, loadingMsg: "Checking the rows against QuickBooks..." },
      }),
    );

  // Forced: a post must never be swallowed by deduplication, and never sent twice by it. The
  // server settles every row it sent, so reload the list to show each row's real state.
  const postRows = (rowIds: string[]) =>
    dispatch(
      importPostActions.postRows({
        params: { rowIds },
        config: { force: true, loadingMsg: "Posting to QuickBooks..." },
      }),
    ).then(() => {
      dispatch(
        importRowActions.getOpenRows({
          params: {},
          config: { force: true, showLoading: false },
        }),
      );
      return reloadMerchantMappings();
    });

  const postRow = (rowId: string) => postRows([rowId]);

  const reconcileRow = (rowId: string) =>
    dispatch(
      importPostActions.reconcileRow({
        params: { rowId },
        config: { force: true, loadingMsg: "Looking for the purchase in QuickBooks..." },
      }),
    ).then(() =>
      dispatch(
        importRowActions.getOpenRows({
          params: {},
          config: { force: true, showLoading: false },
        }),
      ),
    );

  const closePreview = () => dispatch(importPostActions.closePreview());
  const closeBatchPreview = () => dispatch(importPostActions.closeBatchPreview());
  const clearResults = () => dispatch(importPostActions.clearResults());

  return {
    previewPost,
    previewBatch,
    postRow,
    postRows,
    reconcileRow,
    closePreview,
    closeBatchPreview,
    clearResults,
  };
}
