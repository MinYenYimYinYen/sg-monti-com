import { useAppDispatch } from "@/lib/hooks/redux";
import { importPostActions } from "@/app/qbo/importCCTxn/post/importPostSlice";
import { importRowActions } from "@/app/qbo/importCCTxn/rows/importRowSlice";

/** Actions for posting. The preview and results are read with useSelector(importPostSelect...). */
export function useImportPost() {
  const dispatch = useAppDispatch();

  const previewPost = (rowId: string) =>
    dispatch(
      importPostActions.previewPost({
        params: { rowId },
        config: { force: true, loadingMsg: "Checking the row against QuickBooks..." },
      }),
    );

  // Forced: a post must never be swallowed by deduplication, and never sent twice by it.
  const postRow = (rowId: string) =>
    dispatch(
      importPostActions.postRows({
        params: { rowIds: [rowId] },
        config: { force: true, loadingMsg: "Posting to QuickBooks..." },
      }),
    ).then(() =>
      // The server settled the row, so reload the list to show its real state.
      dispatch(
        importRowActions.getOpenRows({
          params: {},
          config: { force: true, showLoading: false },
        }),
      ),
    );

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
  const clearResults = () => dispatch(importPostActions.clearResults());

  return { previewPost, postRow, reconcileRow, closePreview, clearResults };
}
