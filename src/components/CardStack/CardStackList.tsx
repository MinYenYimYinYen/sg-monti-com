"use client";

import React from "react";
import { cn } from "@/style/utils";
import { ScrollArea } from "@/style/components/scroll-area";

interface CardStackListProps {
  children: React.ReactNode;
  className?: string;
  stackOffset?: number;
}

export function CardStackList({
  children,
  className,
  stackOffset = 40,
}: CardStackListProps) {
  const childCount = React.Children.count(children);

  return (
    <ScrollArea className={cn("w-full", className)}>
      <div
        className="relative"
        style={{
          minHeight: `${childCount * stackOffset + 200}px`,
        }}
      >
        {children}
      </div>
    </ScrollArea>
  );
}
