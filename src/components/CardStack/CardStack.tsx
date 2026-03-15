"use client";

import React, { useState, useCallback, useMemo } from "react";
import { cn } from "@/style/utils";
import { CardStackContext, CardRegistration, CardParts } from "./useCardStack";

interface CardStackProps {
  children: React.ReactNode;
  defaultSelected?: string | null;
  onSelectedChange?: (id: string | null) => void;
  className?: string;
}

export function CardStack({
  children,
  defaultSelected = null,
  onSelectedChange,
  className,
}: CardStackProps) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [cards, setCards] = useState(new Map<string, CardRegistration>());
  const [cardParts, setCardParts] = useState(new Map<string, CardParts>());

  const selectCard = useCallback(
    (id: string) => {
      setSelectedId(id);
      onSelectedChange?.(id);
    },
    [onSelectedChange]
  );

  const deselectCard = useCallback(() => {
    setSelectedId(null);
    onSelectedChange?.(null);
  }, [onSelectedChange]);

  const registerCard = useCallback(
    (id: string, ref: React.RefObject<HTMLDivElement | null>) => {
      setCards((prev) => {
        const next = new Map(prev);
        next.set(id, {
          id,
          ref,
          index: next.size,
        });
        return next;
      });
    },
    []
  );

  const unregisterCard = useCallback((id: string) => {
    setCards((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const registerHeader = useCallback((cardId: string, header: React.ReactNode) => {
    setCardParts((prev) => {
      const next = new Map(prev);
      const existing = next.get(cardId) || { header: null, body: null };
      next.set(cardId, { ...existing, header });
      return next;
    });
  }, []);

  const registerBody = useCallback((cardId: string, body: React.ReactNode) => {
    setCardParts((prev) => {
      const next = new Map(prev);
      const existing = next.get(cardId) || { header: null, body: null };
      next.set(cardId, { ...existing, body });
      return next;
    });
  }, []);

  const unregisterParts = useCallback((cardId: string) => {
    setCardParts((prev) => {
      const next = new Map(prev);
      next.delete(cardId);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      selectedId,
      selectCard,
      deselectCard,
      registerCard,
      unregisterCard,
      cards,
      registerHeader,
      registerBody,
      unregisterParts,
      cardParts,
    }),
    [selectedId, selectCard, deselectCard, registerCard, unregisterCard, cards, registerHeader, registerBody, unregisterParts, cardParts]
  );

  return (
    <CardStackContext.Provider value={value}>
      <div className={cn("flex gap-4 h-full w-full", className)}>
        {children}
        {/* Spacer for selected cards to slide into */}
        <div className="flex-1" />
      </div>
    </CardStackContext.Provider>
  );
}
