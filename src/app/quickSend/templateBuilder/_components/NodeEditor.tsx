"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { templateSelect } from "@/app/quickSend/templates/templateSelect";
import { useTemplate } from "@/app/quickSend/templates/useTemplate";
import { TreeNodeDoc, FragmentBlock } from "@/app/quickSend/templates/TemplateTypes";
import {
  DATA_FEATURES,
  CONTENT_FEATURES,
  getFeatureDef,
  TemplateFeatureKey,
} from "@/app/quickSend/templates/templateFeatures";
import { DataFeaturePicker, ContentFeaturePicker } from "./FeaturePicker";
import { BlockContentEditor } from "./BlockContentEditor";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
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
  const [dataFeatures, setDataFeatures] = useState<TemplateFeatureKey[]>(
    (node.fragment?.dataFeatures ?? []) as TemplateFeatureKey[],
  );
  const [blocks, setBlocks] = useState<FragmentBlock[]>(
    node.fragment?.blocks ?? [],
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const isFragment = node.type === "fragment";
  const variablesEnabled = dataFeatures.includes("custIdSearch");

  const updateBlockContent = (blockKey: string, content: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.blockKey === blockKey ? { ...b, content } : b)),
    );
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
    <div className="flex flex-col gap-4 p-4">
      {/* Node type badge + nodeId */}
      <div className="flex items-center gap-2">
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
      <div className="flex items-end gap-3">
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
          <Separator />

          <Tabs defaultValue="features">
            <TabsList variant="primary">
              <TabsTrigger value="features" variant="primary">
                Features
              </TabsTrigger>
              <TabsTrigger value="content" variant="primary">
                Content
              </TabsTrigger>
            </TabsList>

            {/* ── Features tab ── */}
            <TabsContent value="features" className="gap-4 mt-3">
              <DataFeaturePicker
                title="Data Features"
                available={DATA_FEATURES}
                activeKeys={dataFeatures}
                onChange={(keys) =>
                  setDataFeatures(keys as TemplateFeatureKey[])
                }
              />
              <ContentFeaturePicker
                title="Content Features"
                available={CONTENT_FEATURES}
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
                  {variablesEnabled && (
                    <p className="text-xs text-muted-foreground">
                      Type <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-xs">@</kbd> to insert a customer variable.
                    </p>
                  )}
                  {blocks.map((block) => {
                    const def = getFeatureDef(block.feature);
                    const isMultiLine = block.feature === "paragraph";
                    return (
                      <div key={block.blockKey} className="flex flex-col gap-1">
                        <Label>{block.label ?? def.label}</Label>
                        <BlockContentEditor
                          content={block.content}
                          onChange={(html) =>
                            updateBlockContent(block.blockKey, html)
                          }
                          multiLine={isMultiLine}
                          variablesEnabled={variablesEnabled}
                          placeholder={`Enter ${def.label.toLowerCase()}...`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <div className="flex gap-2 pt-2">
        <SaveButton
          status={saveStatus}
          onClick={handleSave}
          onSuccessComplete={() => setSaveStatus("idle")}
        >
          Save
        </SaveButton>
      </div>
    </div>
  );
}
