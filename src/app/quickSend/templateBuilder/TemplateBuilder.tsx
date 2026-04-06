"use client";

import React from "react";
import { useSelector } from "react-redux";
import { useTemplate } from "@/app/quickSend/templates/useTemplate";
import { useTemplateBuilder } from "./useTemplateBuilder";
import { templateBuilderSelect } from "./templateBuilderSelect";
import { NodeTree } from "./_components/NodeTree";
import { NodeEditor } from "./_components/NodeEditor";
import { ScrollArea } from "@/style/components/scroll-area";

export function TemplateBuilder() {
  useTemplate({ autoLoad: true });
  const selectedNodeId = useSelector(templateBuilderSelect.selectedNodeId);
  const { selectNode } = useTemplateBuilder();

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left panel — tree */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Template Builder</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build the navigation tree for QuickSend templates.
          </p>
        </div>
        <ScrollArea className="flex-1 px-2 py-2">
          <NodeTree
            selectedNodeId={selectedNodeId}
            onSelect={selectNode}
          />
        </ScrollArea>
      </div>

      {/* Right panel — editor */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedNodeId ? (
          <ScrollArea className="flex-1">
            <NodeEditor nodeId={selectedNodeId} />
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a node to edit, or add a root category to get started.
          </div>
        )}
      </div>
    </div>
  );
}
