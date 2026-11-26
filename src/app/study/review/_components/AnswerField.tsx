"use client";

import { Label } from "@/style/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/style/components/select";
import { TEXTAREA_CLASS_NAME } from "@/app/knowledgeBase/editor/_components/editorFieldStyles";
import type { CardAnswerFormat } from "@/app/study/StudyTypes";

const FORMAT_OPTIONS: { format: CardAnswerFormat; label: string; help: string }[] = [
  { format: "text", label: "Sentence", help: "One block of text." },
  { format: "points", label: "List", help: "One item per line. Order does not matter." },
  { format: "steps", label: "Steps", help: "One step per line, in order." },
  { format: "groups", label: "Groups", help: "A heading line ending in a colon, then its items on the lines below." },
  {
    format: "table",
    label: "Table",
    help: 'The column names on the first line, then a row per line. Separate cells with " | ".',
  },
];

function parseFormat(value: string): CardAnswerFormat {
  return FORMAT_OPTIONS.find((option) => option.format === value)?.format ?? "text";
}

/** The answer as plain text, with the format that decides how it is stored. Controlled by the dialog. */
export function AnswerField({
  format,
  text,
  onFormatChangeAction,
  onTextChangeAction,
}: {
  format: CardAnswerFormat;
  text: string;
  onFormatChangeAction: (format: CardAnswerFormat) => void;
  onTextChangeAction: (text: string) => void;
}) {
  const help = FORMAT_OPTIONS.find((option) => option.format === format)?.help ?? "";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Label htmlFor="card-answer">Answer</Label>
        <Select value={format} onValueChange={(value) => onFormatChangeAction(parseFormat(value))}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FORMAT_OPTIONS.map((option) => (
              <SelectItem key={option.format} value={option.format}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <textarea
        id="card-answer"
        className={TEXTAREA_CLASS_NAME}
        rows={7}
        value={text}
        onChange={(event) => onTextChangeAction(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  );
}
