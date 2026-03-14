"use client";

import React, { useState, useCallback, useMemo } from "react";
import { cn } from "@/style/utils";
import { CardStackContext, CardRegistration } from "./useCardStack";

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

  const value = useMemo(
    () => ({
      selectedId,
      selectCard,
      deselectCard,
      registerCard,
      unregisterCard,
      cards,
    }),
    [selectedId, selectCard, deselectCard, registerCard, unregisterCard, cards]
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
