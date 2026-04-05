"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { templateSelect } from "@/app/quickSend/templates/templateSelect";
import type { TreeNodeDoc } from "@/app/quickSend/templates/TemplateTypes";
import { cn } from "@/style/utils";
import { ChevronRight } from "lucide-react";

interface TemplateNavTreeProps {
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

/**
 * Read-only navigation tree for the QuickSend send view.
 * Categories expand/collapse; fragments are selectable.
 * No add/delete/edit actions.
 */
export function TemplateNavTree({ selectedNodeId, onSelect }: TemplateNavTreeProps) {
  const allNodes = useSelector(templateSelect.treeNodeDocs);

  return (
    <div className="flex flex-col gap-0.5">
      <NavLevel
        parentId={null}
        depth={0}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
        allNodes={allNodes}
      />
    </div>
  );
}

// ─── NavLevel ────────────────────────────────────────────────────────────────

interface NavLevelProps {
  parentId: string | null;
  depth: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  allNodes: TreeNodeDoc[];
}

function NavLevel({ parentId, depth, selectedNodeId, onSelect, allNodes }: NavLevelProps) {
  const children = allNodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);

  if (children.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {children.map((node) => (
        <NavRow
          key={node.nodeId}
          node={node}
          depth={depth}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          allNodes={allNodes}
        />
      ))}
    </div>
  );
}

// ─── NavRow ──────────────────────────────────────────────────────────────────

interface NavRowProps {
  node: TreeNodeDoc;
  depth: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  allNodes: TreeNodeDoc[];
}

function NavRow({ node, depth, selectedNodeId, onSelect, allNodes }: NavRowProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedNodeId === node.nodeId;
  const isCategory = node.type === "category";
  const hasChildren = allNodes.some((n) => n.parentId === node.nodeId);

  const handleClick = () => {
    if (isCategory) {
      setExpanded((prev) => !prev);
    } else {
      onSelect(node.nodeId);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md py-1 cursor-pointer text-sm",
          isCategory
            ? "text-foreground/60 font-medium"
            : isSelected
              ? "bg-primary/20 text-foreground font-medium"
              : "text-foreground/80 hover:bg-accent/10",
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px`, paddingRight: "8px" }}
        onClick={handleClick}
      >
        {isCategory ? (
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 text-foreground/40 transition-transform",
              expanded && hasChildren && "rotate-90",
            )}
          />
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <span className="truncate">{node.label}</span>
      </div>

      {isCategory && expanded && (
        <NavLevel
          parentId={node.nodeId}
          depth={depth + 1}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          allNodes={allNodes}
        />
      )}
    </div>
  );
}
