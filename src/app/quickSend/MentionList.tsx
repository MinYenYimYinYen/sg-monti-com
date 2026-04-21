"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";

type MentionItem = { id: string; label: string };

type Props = {
  items: MentionItem[];
  command: (item: MentionItem) => void;
};

export type MentionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

export const MentionList = forwardRef<MentionListHandle, Props>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    React.useEffect(() => setSelectedIndex(0), [items]);
    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) return null;

    return (
      <div className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-card shadow-md">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`flex w-full items-center px-3 py-1.5 text-sm transition-colors ${
              index === selectedIndex
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-accent/10"
            }`}
            onClick={() => command(item)}
          >
            @{item.label}
          </button>
        ))}
      </div>
    );
  },
);
