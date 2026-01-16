"use client";

import * as React from "react";
import { cn } from "@/style/utils";

interface TabControlProps {
  tabs: {
    id: string;
    label: string;
    content: React.ReactNode;
    badge?: number;
  }[];
  defaultTab?: string;
  className?: string;
}

export function TabControl({
  tabs,
  defaultTab,
  className,
}: TabControlProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={cn("flex flex-col w-full h-full", className)}>
      {/* Tab Header */}
      <div className="flex border-b border-sg-blue-brdr/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium transition-colors hover:bg-sg-blue-bg/50",
              activeTab === tab.id
                ? "text-sg-blue-brdr border-b-2 border-sg-blue-brdr"
                : "text-sg-subtle text-opacity-70",
            )}
          >
            {tab.label}
            {tab.badge ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-sg-warn-fg px-1.5 py-0.5 text-xs font-bold text-white">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">{activeContent}</div>
    </div>
  );
}
