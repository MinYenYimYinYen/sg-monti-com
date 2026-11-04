import { useEffect } from "react";
import { useAppDispatch } from "@/lib/hooks/redux";
import { qboConnectionActions } from "@/app/qbo/connection/qboConnectionSlice";

/** Loads the connection status on mount (always fresh) and exposes actions only. */
export function useQboConnection() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(
      qboConnectionActions.getQboStatus({
        params: {},
        config: { force: true, loadingMsg: "Checking QuickBooks connection..." },
      }),
    );
  }, [dispatch]);

  const disconnect = () => {
    dispatch(
      qboConnectionActions.disconnectQbo({
        params: {},
        config: { loadingMsg: "Disconnecting from QuickBooks..." },
      }),
    );
  };

  const dismissRevocationNotice = () => {
    dispatch(qboConnectionActions.dismissRevocationNotice());
  };

  // Forced: the test must always make a live call, never be deduplicated.
  const testConnection = () => {
    dispatch(
      qboConnectionActions.testQboConnection({
        params: {},
        config: { force: true, loadingMsg: "Testing QuickBooks connection..." },
      }),
    );
  };

  return { disconnect, dismissRevocationNotice, testConnection };
}
