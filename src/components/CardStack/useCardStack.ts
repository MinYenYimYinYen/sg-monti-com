"use client";

import { createContext, useContext, RefObject } from "react";

export type CardRegistration = {
  id: string;
  ref: RefObject<HTMLDivElement | null>;
  index: number;
};

export type CardStackContextValue = {
  selectedId: string | null;
  selectCard: (id: string) => void;
  deselectCard: () => void;
  registerCard: (id: string, ref: RefObject<HTMLDivElement | null>) => void;
  unregisterCard: (id: string) => void;
  cards: Map<string, CardRegistration>;
};

export const CardStackContext = createContext<CardStackContextValue | null>(null);

export function useCardStack() {
  const context = useContext(CardStackContext);
  if (!context) {
    throw new Error("useCardStack must be used within CardStack");
  }
  return context;
}
