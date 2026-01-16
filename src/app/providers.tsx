"use client";

import { Provider } from "react-redux";
import { ReactNode, useRef } from "react";
import { AppStore, makeStore } from "@/store";
import AuthInitializer from "@/app/auth/_components/AuthInitializer";

export function Providers({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore>(null);
  // eslint-disable-next-line react-hooks/refs
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }
  return (
  // eslint-disable-next-line react-hooks/refs
    <Provider store={storeRef.current}>
      <AuthInitializer>{children}</AuthInitializer>
    </Provider>
  );
}
