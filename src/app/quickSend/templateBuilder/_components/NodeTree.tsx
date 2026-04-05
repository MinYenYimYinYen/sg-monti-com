"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { templateSelect } from "@/app/quickSend/templates/templateSelect";
import { TreeNodeDoc, TreeNodeType } from "@/app/quickSend/templates/TemplateTypes";
import { useTemplate } from "@/app/quickSend/templates/useTemplate";
import { Button } from "@/style/components/button";
import { cn } from "@/style/utils";
import { ChevronRight, Plus, Trash2 } from "lucide-react";

interface NodeTreeProps {
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

export function NodeTree({ selectedNodeId, onSelect }: NodeTreeProps) {
  const { addNode, removeNode } = useTemplate();
  const allNodes = useSelector(templateSelect.treeNodeDocs);

  const handleAddRoot = () => {
    const nodeId = `node-${Date.now()}`;
    addNode({
      nodeId,
      parentId: null,
      label: "New Category",
      type: "category",
      order: allNodes.filter((n) => n.parentId === null).length,
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
          Tree
        </span>
        <Button
          size="sm"
          variant="accent"
          intensity="soft"
          onClick={handleAddRoot}
        >
          <Plus className="h-3 w-3" />
          Root
        </Button>
      </div>
      <NodeLevel
        parentId={null}
        depth={0}
        selectedNodeId={selectedNodeId}
        onSelect={onSelect}
        addNode={addNode}
        removeNode={removeNode}
        allNodes={allNodes}
      />
    </div>
  );
}

interface NodeLevelProps {
  parentId: string | null;
  depth: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  addNode: (node: TreeNodeDoc) => void;
  removeNode: (nodeId: string) => void;
  allNodes: TreeNodeDoc[];
}

function NodeLevel({
  parentId,
  depth,
  selectedNodeId,
  onSelect,
  addNode,
  removeNode,
  allNodes,
}: NodeLevelProps) {
  const children = allNodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order);

  if (children.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {children.map((node) => (
        <NodeRow
          key={node.nodeId}
          node={node}
          depth={depth}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          addNode={addNode}
          removeNode={removeNode}
          allNodes={allNodes}
        />
      ))}
    </div>
  );
}

interface NodeRowProps {
  node: TreeNodeDoc;
  depth: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  addNode: (node: TreeNodeDoc) => void;
  removeNode: (nodeId: string) => void;
  allNodes: TreeNodeDoc[];
}

function NodeRow({
  node,
  depth,
  selectedNodeId,
  onSelect,
  addNode,
  removeNode,
  allNodes,
}: NodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedNodeId === node.nodeId;
  const isCategory = node.type === "category";
  const children = allNodes.filter((n) => n.parentId === node.nodeId);
  const hasChildren = children.length > 0;

  const handleAddChild = (type: TreeNodeType) => {
    const nodeId = `node-${Date.now()}`;
    const siblingCount = allNodes.filter(
      (n) => n.parentId === node.nodeId,
    ).length;
    addNode({
      nodeId,
      parentId: node.nodeId,
      label: type === "category" ? "New Category" : "New Fragment",
      type,
      order: siblingCount,
      ...(type === "fragment" ? { fragment: {} } : undefined),
    });
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 cursor-pointer group",
          isSelected
            ? "bg-primary/20 text-foreground"
            : "hover:bg-accent/10 text-foreground/80",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.nodeId)}
      >
        {/* Expand toggle for categories */}
        {isCategory ? (
          <button
            className="shrink-0 text-foreground/40 hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                expanded && hasChildren && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        {/* Type badge */}
        <span
          className={cn(
            "text-[10px] font-semibold px-1 rounded shrink-0",
            isCategory
              ? "bg-primary/20 text-primary"
              : "bg-accent/20 text-accent",
          )}
        >
          {isCategory ? "CAT" : "FRAG"}
        </span>

        {/* Label */}
        <span className="text-sm flex-1 truncate">{node.label}</span>

        {/* Actions (visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-1">
          {isCategory && (
            <>
              <button
                title="Add category child"
                className="text-foreground/40 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddChild("category");
                }}
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                title="Add fragment child"
                className="text-foreground/40 hover:text-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddChild("fragment");
                }}
              >
                <span className="text-[9px] font-bold">F+</span>
              </button>
            </>
          )}
          <button
            title="Delete node"
            className="text-foreground/40 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              removeNode(node.nodeId);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {isCategory && expanded && (
        <NodeLevel
          parentId={node.nodeId}
          depth={depth + 1}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          addNode={addNode}
          removeNode={removeNode}
          allNodes={allNodes}
        />
      )}
    </div>
  );
}
