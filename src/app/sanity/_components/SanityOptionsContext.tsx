"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type SanityOptionsContextValue = {
  sortSlot: ReactNode;
  setSortSlot: (node: ReactNode) => void;
};

const SanityOptionsContext = createContext<SanityOptionsContextValue>({
  sortSlot: null,
  setSortSlot: () => {},
});

export function SanityOptionsProvider({ children }: { children: ReactNode }) {
  const [sortSlot, setSortSlot] = useState<ReactNode>(null);

  return (
    <SanityOptionsContext.Provider value={{ sortSlot, setSortSlot }}>
      {children}
    </SanityOptionsContext.Provider>
  );
}

export function useSanityOptions() {
  return useContext(SanityOptionsContext);
}
