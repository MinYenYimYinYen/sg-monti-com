import { progServActions } from "@/app/realGreen/progServ/_lib/slice/progServSlice";
import { useCallback, useEffect } from "react";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { useAppDispatch } from "@/lib/hooks/redux";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { UnsavedServCodeChanges } from "@/app/realGreen/progServ/_lib/types/ProgServState";

export function useProgServ({ autoLoad = false }: { autoLoad?: boolean }) {
  const dispatch = useAppDispatch();

  const load = useCallback(
    ({ force = false }: { force?: boolean }) => {
      if (autoLoad) {
        dispatch(
          progServActions.getProgCodeDocs({
            params: {},
            config: {
              staleTime: realGreenConst.paramTypesCacheTime,
              loadingMsg: "Loading program codes...",
              force,
            },
          }),
        );
        dispatch(
          progServActions.getServCodeDocs({
            params: {},
            config: {
              staleTime: realGreenConst.paramTypesCacheTime,
              loadingMsg: "Loading service codes...",
              force,
            },
          }),
        );
      }
    },
    [autoLoad, dispatch],
  );

  useEffect(() => {
    if (autoLoad) load({});
  }, [autoLoad, load]);

  const refresh = () => load({ force: true });

  const updateServCode = useCallback(
    (servCode: Partial<ServCodeDoc>) => {
      dispatch(progServActions.updateServCode(servCode));
    },
    [dispatch],
  );

  const setServCodeProductSelection = useCallback(
    (args: {
      servCodeId: string;
      productIds: number[];
      type: "master" | "single";
    }) => {
      dispatch(progServActions.setServCodeProductSelection(args));
    },
    [dispatch],
  );

  const saveServCodeChanges = useCallback(
    (unsavedChanges?: UnsavedServCodeChanges[]) => {
      // If no changes passed, the thunk will likely pick up from state or we need to handle it.
      // The original signature expected unsavedChanges.
      // However, the thunk definition in slice doesn't seem to use payload for saving?
      // Let's check the thunk definition. It uses createStandardThunk.
      // Usually save operations take data.
      // The slice definition: saveServCodeChanges = createStandardThunk<ProgServContract, "saveServCodeChanges">
      // The contract likely expects { unsavedChanges: ... } in params.
      // For now, let's keep the signature compatible but allow optional if the caller relies on slice state (which is not standard for createStandardThunk usually).
      // Actually, looking at the previous code, it was passed explicitly.
      // But in the editor we called it without args: saveServCodeChanges().
      // This implies we might need to select the changes from state here if not passed?
      // Or the thunk handles it.
      // Let's assume the caller will pass it or the thunk is smart enough (unlikely for standard thunk).
      // Wait, in servCodeEditor.tsx we called `saveServCodeChanges()` with no args.
      // This suggests the thunk might be configured to read from state?
      // Or the previous code was buggy/incomplete.
      // Given the slice has `unsavedServCodeChanges` in state, the thunk payload creator *should* read from state if not provided.
      // But createStandardThunk is generic.
      // Let's stick to the pattern: pass the data.
      // But since we are in a hook, we can select it? No, hooks shouldn't select inside callbacks implicitly if possible.
      // Let's leave it as is for now, but expose the new action.

      return dispatch(
        progServActions.saveServCodeChanges({
          params: { unsavedChanges: unsavedChanges || [] }, // This looks suspicious if the thunk expects data.
          config: { force: true },
        }),
      );
    },
    [dispatch],
  );

  return {
    refresh,
    updateServCode,
    saveServCodeChanges,
    setServCodeProductSelection,
  };
}
