"use client";

import React, { useEffect, createContext, useContext } from "react";
import { useCardStack } from "./useCardStack";

interface CardStackHeaderProps {
  children: React.ReactNode;
}

// Context to provide card ID from CardStackCard to its children
export const CardIdContext = createContext<string | null>(null);

/**
 * Wrapper component that auto-registers a card header with the CardStack context.
 * Must be used within a CardStackCard component.
 */
export function CardStackHeader({ children }: CardStackHeaderProps) {
  const { registerHeader } = useCardStack();
  const cardId = useContext(CardIdContext);

  useEffect(() => {
    if (cardId) {
      registerHeader(cardId, children);
    }
  }, [cardId, children, registerHeader]);

  // Render children directly - they'll be picked up by CardStackCard from context
  return <>{children}</>;
}
