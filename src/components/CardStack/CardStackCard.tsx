"use client";

import React, { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/style/utils";
import { Card } from "@/style/components/card";
import { CircleX } from "lucide-react";
import { useCardStack } from "./useCardStack";

interface CardStackCardProps {
  id: string;
  title?: string;
  variant?: "default" | "create";
  children: React.ReactNode;
  className?: string;
}

export function CardStackCard({
  id,
  title,
  variant = "default",
  children,
  className,
}: CardStackCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { selectedId, selectCard, deselectCard, registerCard, unregisterCard, cards } =
    useCardStack();

  const isSelected = selectedId === id;
  const index = Array.from(cards.values()).findIndex((c) => c.id === id);

  useEffect(() => {

    registerCard(id, cardRef);
    return () => unregisterCard(id);
  }, [id, registerCard, unregisterCard]);

  useGSAP(
    () => {
      if (!cardRef.current) return;

      if (isSelected) {
        const currentY = index * 40;
        gsap.to(cardRef.current, {
          x: 320,
          y: currentY,
          scale: 1.02,
          zIndex: 100,
          duration: 0.4,
          ease: "power2.out",
        });
      } else {
        gsap.to(cardRef.current, {
          x: 0,
          y: index * 40,
          scale: 1,
          zIndex: index,
          duration: 0.3,
          ease: "power2.inOut",
        });
      }
    },
    { dependencies: [isSelected, index, cards.size] }
  );

  const variantClasses = {
    default: "border-border bg-card",
    create: "border-2 border-dashed border-primary bg-card",
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        "absolute w-[280px] transition-shadow hover:shadow-lg",
        !isSelected && "cursor-pointer shadow-[0_-2px_4px_rgba(0,0,0,0.1)]",
        variantClasses[variant],
        className
      )}
      onClick={() => !isSelected && selectCard(id)}
    >
      {isSelected && (
        <button
          className="absolute top-2 right-2 z-10 p-1 rounded-full hover:bg-accent/50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            deselectCard();
          }}
          aria-label="Close"
        >
          <CircleX className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </button>
      )}
      {children}
    </Card>
  );
}
