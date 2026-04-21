"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { templateSelect } from "@/app/quickSend_bad/templates/templateSelect";
import { useTemplate } from "@/app/quickSend_bad/templates/useTemplate";
import { templateBuilderSelect } from "../templateBuilderSelect";
import { useTemplateBuilder } from "../useTemplateBuilder";
import { TreeNodeDoc, FragmentBlock } from "@/app/quickSend_bad/templates/TemplateTypes";
import { DATA_FEATURE_DEFS, DataFeatureKey, type DataFeatureDef } from "@/app/quickSend_bad/templates/dataFeatures/dataFeatures";
import { CONTENT_FEATURE_DEFS, getContentFeatureDef } from "@/app/quickSend_bad/templates/contentFeatures/contentFeatures";
import { getBuilderFlags } from "@/app/quickSend_bad/templates/dataFeatures/dataFeatureHelpers";
import { DataFeaturePicker, ContentFeaturePicker } from "./FeaturePicker";
import { BlockContentEditor } from "./BlockContentEditor";
import { TableBlockEditor } from "./TableBlockEditor";
import type { TableConfig } from "@/app/quickSend_bad/templates/TemplateTypes";
import { TABLE_DATA_SOURCES } from "@/app/quickSend_bad/templates/dataFeatures/dataFeatureVariables";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { Separator } from "@/style/components/separator";
import { FormGroup } from "@/components/FormGroup";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/style/components/tabs";

interface NodeEditorProps {
  nodeId: string;
}

export function NodeEditor({ nodeId }: NodeEditorProps) {
  const selectNode = templateSelect.nodeById(nodeId);
  const node = useSelector(selectNode);
  const { saveNode } = useTemplate();

  if (!node) {
    return (
      <div className="text-sm text-muted-foreground p-4">Node not found.</div>
    );
  }

  return <NodeEditorForm key={nodeId} node={node} saveNode={saveNode} />;
}

interface NodeEditorFormProps {
  node: TreeNodeDoc;
  saveNode: (node: TreeNodeDoc) => void;
}

function NodeEditorForm({ node, saveNode }: NodeEditorFormProps) {
  const [label, setLabel] = useState(node.label);
  const [order, setOrder] = useState(node.order);
  const [dataFeatures, setDataFeatures] = useState<DataFeatureKey[]>(
    (node.fragment?.dataFeatures ?? []) as DataFeatureKey[],
  );
  const [blocks, setBlocks] = useState<FragmentBlock[]>(
    node.fragment?.blocks ?? [],
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const selectedBlockKeys = useSelector(templateBuilderSelect.selectedBlockKeys);
  const canCreateGroup = useSelector(templateBuilderSelect.canCreateGroup);
  const { clearBlockSelection } = useTemplateBuilder();

  const isFragment = node.type === "fragment";
  const { customerVariablesEnabled, seasonVariableEnabled, progCodeVariablesEnabled } = getBuilderFlags(dataFeatures);

  const tableDataSource = (DATA_FEATURE_DEFS as readonly DataFeatureDef[]).find(
    (def) => dataFeatures.includes(def.key as DataFeatureKey) && def.tableDataSource,
  )?.tableDataSource;
  const tableRowColumns: Record<string, string> =
    tableDataSource ? (TABLE_DATA_SOURCES[tableDataSource]?.rowColumns ?? {}) : {};

  const updateBlockContent = (blockKey: string, content: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.blockKey === blockKey ? { ...b, content } : b)),
    );
  };

  const handleCreateGroup = () => {
    const targetGroupId = Math.min(
      ...blocks.filter((b) => selectedBlockKeys.includes(b.blockKey)).map((b) => b.group.groupId),
    );
    const targetLabel = blocks.find((b) => selectedBlockKeys.includes(b.blockKey) && b.group.groupId === targetGroupId)?.group.label;
    setBlocks(
      blocks.map((b) =>
        selectedBlockKeys.includes(b.blockKey)
          ? { ...b, group: { groupId: targetGroupId, label: targetLabel } }
          : b,
      ),
    );
    clearBlockSelection();
  };

  const handleCreateChoice = () => {
    const targetChoiceId = Math.min(
      ...blocks.filter((b) => selectedBlockKeys.includes(b.blockKey)).map((b) => b.choice.choiceId),
    );
    const targetLabel = blocks.find((b) => selectedBlockKeys.includes(b.blockKey) && b.choice.choiceId === targetChoiceId)?.choice.label;
    setBlocks(
      blocks.map((b) =>
        selectedBlockKeys.includes(b.blockKey)
          ? { ...b, choice: { choiceId: targetChoiceId, label: targetLabel } }
          : b,
      ),
    );
    clearBlockSelection();
  };

  const handleSave = async () => {
    setSaveStatus("saving");

    const updated: TreeNodeDoc = {
      ...node,
      label,
      order,
      ...(isFragment
        ? {
            fragment: {
              dataFeatures: dataFeatures.length > 0 ? dataFeatures : undefined,
              blocks: blocks.length > 0 ? blocks : undefined,
            },
          }
        : {}),
    };

    await saveNode(updated);
    setSaveStatus("success");
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3">
      {/* Node type badge + nodeId */}
      <div className="shrink-0 flex items-center gap-2">
        <span
          className={
            isFragment
              ? "text-xs font-semibold bg-accent/20 text-accent px-2 py-0.5 rounded"
              : "text-xs font-semibold bg-primary/20 text-primary px-2 py-0.5 rounded"
          }
        >
          {isFragment ? "Fragment" : "Category"}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {node.nodeId}
        </span>
      </div>

      {/* Label + Order — always visible */}
      <div className="shrink-0 flex items-end gap-3">
        <FormGroup className="flex-1">
          <Label>Label</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Display name"
          />
        </FormGroup>
        <FormGroup>
          <Label>Order</Label>
          <Input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="w-20"
          />
        </FormGroup>
      </div>

      {isFragment && (
        <>
          <Separator className="shrink-0" />

          <Tabs defaultValue="features" className="flex-1 flex flex-col min-h-0">
            <TabsList variant="primary" className="shrink-0">
              <TabsTrigger value="features" variant="primary">
                Features
              </TabsTrigger>
              <TabsTrigger value="content" variant="primary">
                Content
              </TabsTrigger>
            </TabsList>

            {/* ── Features tab ── */}
            <TabsContent value="features" className="flex-1 flex flex-col min-h-0 gap-4 mt-3">
              <DataFeaturePicker
                title="Data Features"
                available={DATA_FEATURE_DEFS}
                activeKeys={dataFeatures}
                onChange={(keys) => setDataFeatures(keys as DataFeatureKey[])}
              />
              <ContentFeaturePicker
                title="Content Features"
                available={CONTENT_FEATURE_DEFS}
                blocks={blocks}
                onChange={setBlocks}
              />
            </TabsContent>

            {/* ── Content tab ── */}
            <TabsContent value="content" className="gap-3 mt-3">
              {blocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No content features selected. Add some in the Features tab.
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {(customerVariablesEnabled || seasonVariableEnabled) && (
                    <p className="text-xs text-muted-foreground">
                      Type{" "}
                      <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-xs">
                        @
                      </kbd>{" "}
                      to insert a variable.
                    </p>
                  )}
                  {blocks.map((block) => {
                    const def = getContentFeatureDef(block.feature);
                    return (
                      <div key={block.blockKey} className="flex flex-col gap-1">
                        <Label>{block.label ?? def.label}</Label>
                        {block.feature === "table" ? (
                          <TableBlockEditor
                            tableConfig={
                              block.tableConfig ?? {
                                dataSource: "progCode.servCodes",
                                showHeaders: false,
                                columns: [],
                              }
                            }
                            rowColumns={tableRowColumns}
                            onChange={(tableConfig: TableConfig) =>
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.blockKey === block.blockKey
                                    ? { ...b, tableConfig }
                                    : b,
                                ),
                              )
                            }
                          />
                        ) : (
                          <BlockContentEditor
                            content={block.content}
                            onChange={(html) =>
                              updateBlockContent(block.blockKey, html)
                            }
                            multiLine={def.multiLine}
                            customerVariablesEnabled={customerVariablesEnabled}
                            seasonVariableEnabled={seasonVariableEnabled}
                            progCodeVariablesEnabled={progCodeVariablesEnabled}
                            placeholder={`Enter ${def.label.toLowerCase()}...`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <div className="shrink-0 flex flex-col gap-2">
        {isFragment && selectedBlockKeys.length >= 2 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/10 border border-accent/30">
            <span className="text-xs font-medium text-foreground/80">
              {selectedBlockKeys.length} blocks selected
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <SaveButton
            status={saveStatus}
            onClick={handleSave}
            onSuccessComplete={() => setSaveStatus("idle")}
          >
            Save
          </SaveButton>
          {isFragment && (
            <>
              <Button
                size="default"
                variant="primary"
                intensity="soft"
                disabled={!canCreateGroup}
                onClick={handleCreateGroup}
              >
                Create Group
              </Button>
              <Button
                size="default"
                variant="secondary"
                intensity="soft"
                disabled={!canCreateGroup}
                onClick={handleCreateChoice}
              >
                Create Choice
              </Button>
              <Button
                size="default"
                variant="outline"
                intensity="ghost"
                disabled={selectedBlockKeys.length === 0}
                onClick={clearBlockSelection}
              >
                Clear
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
