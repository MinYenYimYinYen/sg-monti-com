import { useAppDispatch } from "@/lib/hooks/redux";
import { useEffect } from "react";
import { seasonIncreasesActions } from "@/app/priceIncrease/seasonIncreases/seasonIncreasesSlice";

export function useSeasonIncreases() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      seasonIncreasesActions.getAllSeasonIncreases({
        params: {},
        config: { loadingMsg: "Loading season increases..." },
      }),
    );
  }, [dispatch]);
}
