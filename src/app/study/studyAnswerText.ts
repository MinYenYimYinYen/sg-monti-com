import type { CardAnswer } from "@/app/study/StudyTypes";

// Answers are edited as plain text in one box, and turned back into the stored shape on save. Pure.
// Lists are one entry per line. Groups use a heading line ending in a colon. A table is its columns
// on the first line and a row per line after it, cells separated by " | ".

const CELL_SEPARATOR = " | ";

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

export function answerToText(answer: CardAnswer): string {
  switch (answer.format) {
    case "text":
      return answer.text;
    case "points":
      return answer.points.join("\n");
    case "steps":
      return answer.steps.join("\n");
    case "groups":
      return answer.groups.map((group) => [`${group.label}:`, ...group.points].join("\n")).join("\n\n");
    case "table":
      return [answer.columns, ...answer.rows].map((cells) => cells.join(CELL_SEPARATOR)).join("\n");
  }
}

export type ParsedAnswer = { ok: true; answer: CardAnswer } | { ok: false; message: string };

function parseGroups(lines: string[]): ParsedAnswer {
  const groups: { label: string; points: string[] }[] = [];
  for (const line of lines) {
    if (line.endsWith(":")) {
      groups.push({ label: line.slice(0, -1).trim(), points: [] });
    } else if (groups.length === 0) {
      return { ok: false, message: "A group list starts with a heading line that ends in a colon." };
    } else {
      groups[groups.length - 1].points.push(line);
    }
  }
  if (groups.some((group) => group.label === "" || group.points.length === 0)) {
    return { ok: false, message: "Every group needs a heading and at least one line under it." };
  }
  return { ok: true, answer: { format: "groups", groups } };
}

function parseTable(lines: string[]): ParsedAnswer {
  const [header, ...body] = lines.map((line) => line.split("|").map((cell) => cell.trim()));
  if (!header || body.length === 0) return { ok: false, message: "A table needs a column line and at least one row." };
  if (body.some((row) => row.length !== header.length)) {
    return { ok: false, message: `Every row needs ${header.length} cells separated by " | ".` };
  }
  return { ok: true, answer: { format: "table", columns: header, rows: body } };
}

/** Text to the stored shape for the chosen format. Never throws; the message says what to fix. */
export function textToAnswer({ text, format }: { text: string; format: CardAnswer["format"] }): ParsedAnswer {
  const lines = splitLines(text);
  if (lines.length === 0) return { ok: false, message: "The answer cannot be empty." };

  switch (format) {
    case "text":
      return { ok: true, answer: { format, text: text.trim() } };
    case "points":
      return { ok: true, answer: { format, points: lines } };
    case "steps":
      return { ok: true, answer: { format, steps: lines } };
    case "groups":
      return parseGroups(lines);
    case "table":
      return parseTable(lines);
  }
}

/** One line for a list row, so a card's answer can be skimmed without opening it. */
export function summarizeAnswer(answer: CardAnswer): string {
  const flat = answerToText(answer).replace(/\s+/g, " ").trim();
  return flat.length <= 120 ? flat : `${flat.slice(0, 119).trimEnd()}…`;
}
