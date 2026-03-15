"use client";

import React, { useEffect, useContext } from "react";
import { useCardStack } from "./useCardStack";
import { CardIdContext } from "./CardStackHeader";

interface CardStackBodyProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that auto-registers a card body with the CardStack context.
 * Must be used within a CardStackCard component.
 * Only renders when the card is selected.
 */
export function CardStackBody({ children }: CardStackBodyProps) {
  const { registerBody } = useCardStack();
  const cardId = useContext(CardIdContext);

  useEffect(() => {
    if (cardId) {
      registerBody(cardId, children);
    }
  }, [cardId, children, registerBody]);

  // Render children directly - they'll be picked up by CardStackCard from context
  return <>{children}</>;
}
