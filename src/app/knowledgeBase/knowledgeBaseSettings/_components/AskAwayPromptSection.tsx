"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { MAX_SYSTEM_CHARS } from "@/app/anthropic/anthropicConst";
import { Notice } from "@/app/permission/_components/Notice";
import { Button } from "@/style/components/button";
import { cn } from "@/style/utils";
import { TEXTAREA_CLASS_NAME } from "@/app/knowledgeBase/editor/_components/editorFieldStyles";
import { ASK_AWAY_PROMPT_TOKENS } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsConst";
import { DEFAULT_ASK_AWAY_PROMPT_TEMPLATE } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsDefaults";
import { findPromptTemplateProblems } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsLogic";
import { knowledgeBaseSettingsSelect } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSelect";
import { useSaveKnowledgeBaseSettings } from "@/app/knowledgeBase/knowledgeBaseSettings/useSaveKnowledgeBaseSettings";

/** The instructions Ask Away sends to Claude. The topic list is added after them by the app. */
export function AskAwayPromptSection({ canWrite }: { canWrite: boolean }) {
  const doc = useSelector(knowledgeBaseSettingsSelect.askAwayPromptDoc);
  if (!doc) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">Ask Away prompt</h2>
        <p className="text-xs text-muted-foreground">
          The instructions Claude follows in Ask Away. The list of topics is added after this text automatically, and
          the two together must fit within {MAX_SYSTEM_CHARS.toLocaleString("en-US")} characters.
        </p>
      </div>
      <AskAwayPromptEditor
        key={doc.updatedAt ?? "default"}
        savedTemplate={doc.value.template}
        canWrite={canWrite}
        isDefault={doc.updatedAt === undefined}
      />
    </section>
  );
}

// Initialized from the saved text and remounted (by key) when a save changes it, so there is no effect
// copying props into state.
function AskAwayPromptEditor({
  savedTemplate,
  canWrite,
  isDefault,
}: {
  savedTemplate: string;
  canWrite: boolean;
  isDefault: boolean;
}) {
  const { saveAskAwayPrompt } = useSaveKnowledgeBaseSettings();
  const [template, setTemplate] = useState(savedTemplate);

  const problems = findPromptTemplateProblems(template);
  const isDirty = template !== savedTemplate;
  const isDefaultText = template === DEFAULT_ASK_AWAY_PROMPT_TEMPLATE;
  const canSave = canWrite && isDirty && problems.length === 0 && template.trim().length > 0;

  return (
    <div className="space-y-3">
      {isDefault && <Notice>This is the built-in prompt. Nothing has been saved yet.</Notice>}
      <textarea
        className={cn(TEXTAREA_CLASS_NAME, "min-h-[420px] font-mono text-xs")}
        maxLength={MAX_SYSTEM_CHARS}
        value={template}
        disabled={!canWrite}
        onChange={(event) => setTemplate(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {template.length.toLocaleString("en-US")} of {MAX_SYSTEM_CHARS.toLocaleString("en-US")} characters, before the
        topic list. Placeholders the app fills in:{" "}
        {ASK_AWAY_PROMPT_TOKENS.map((token) => `{{${token}}}`).join(", ")}
      </p>
      {problems.length > 0 && (
        <Notice tone="warning">
          <ul className="list-disc space-y-1 pl-4">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Notice>
      )}
      <div className="flex gap-2">
        <Button size="sm" disabled={!canSave} onClick={() => saveAskAwayPrompt(template)}>
          Save prompt
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!canWrite || isDefaultText}
          onClick={() => setTemplate(DEFAULT_ASK_AWAY_PROMPT_TEMPLATE)}
        >
          Reset to default
        </Button>
        <Button size="sm" variant="outline" disabled={!isDirty} onClick={() => setTemplate(savedTemplate)}>
          Discard changes
        </Button>
      </div>
    </div>
  );
}
