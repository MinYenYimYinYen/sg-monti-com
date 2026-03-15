"use client";

import { createContext, useContext, RefObject, ReactNode } from "react";

export type CardRegistration = {
  id: string;
  ref: RefObject<HTMLDivElement | null>;
  index: number;
};

export type CardParts = {
  header: ReactNode | null;
  body: ReactNode | null;
};

export type CardStackContextValue = {
  selectedId: string | null;
  selectCard: (id: string) => void;
  deselectCard: () => void;
  registerCard: (id: string, ref: RefObject<HTMLDivElement | null>) => void;
  unregisterCard: (id: string) => void;
  cards: Map<string, CardRegistration>;
  registerHeader: (cardId: string, header: ReactNode) => void;
  registerBody: (cardId: string, body: ReactNode) => void;
  unregisterParts: (cardId: string) => void;
  cardParts: Map<string, CardParts>;
};

export const CardStackContext = createContext<CardStackContextValue | null>(null);

export function useCardStack() {
  const context = useContext(CardStackContext);
  if (!context) {
    throw new Error("useCardStack must be used within CardStack");
  }
  return context;
}
