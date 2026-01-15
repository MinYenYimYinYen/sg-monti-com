"use client";

import { Provider } from "react-redux";
import { ReactNode, useRef } from "react";
import { AppStore, makeStore } from "@/store";

export function Providers({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore>(null);
  // eslint-disable-next-line react-hooks/refs
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }
  // eslint-disable-next-line react-hooks/refs
  return <Provider store={storeRef.current}>{children}</Provider>;
}
