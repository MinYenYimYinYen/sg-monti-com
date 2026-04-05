"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useTemplate } from "@/app/quickSend/templates/useTemplate";
import { templateSelect } from "@/app/quickSend/templates/templateSelect";
import { TemplateNavTree } from "@/app/quickSend/templateSender/_components/TemplateNavTree";
import { TemplateSender } from "@/app/quickSend/templateSender/TemplateSender";
import { ScrollArea } from "@/style/components/scroll-area";

export function QuickSend() {
  useTemplate({ autoLoad: true });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectNode = templateSelect.nodeById(selectedNodeId ?? "");
  const selectedNode = useSelector(selectNode);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left panel — read-only template navigator */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Templates</h2>
        </div>
        <ScrollArea className="flex-1 px-2 py-2">
          <TemplateNavTree
            selectedNodeId={selectedNodeId}
            onSelect={setSelectedNodeId}
          />
        </ScrollArea>
      </div>

      {/* Right panel — sender */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <TemplateSender
            fragment={selectedNode?.fragment}
            label={selectedNode?.label}
          />
        </ScrollArea>
      </div>
    </div>
  );
}
