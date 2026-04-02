"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { authSelect } from "@/app/auth/authSlice";
import type { CrmData } from "./QuickSend";

type Visit = { season: string; price: number };

const PREFERRED_VISITS: Visit[] = [
  { season: "Early Spring", price: 49 },
  { season: "Late Spring", price: 49 },
  { season: "Early Summer", price: 49 },
  { season: "Late Summer", price: 49 },
  { season: "Early Fall", price: 49 },
  { season: "Late Fall", price: 49 },
];

const ECONOMY_VISITS: Visit[] = [
  { season: "Spring", price: 49 },
  { season: "Early Summer", price: 49 },
  { season: "Late Summer", price: 49 },
  { season: "Fall", price: 49 },
];

function buildVisitTable(visits: Visit[], sqFt: number, price: number): string {
  const perVisit = sqFt > 0 ? price : 49;
  const rows = visits
    .map(
      (v) =>
        `<tr>
          <td style="padding: 4px 12px 4px 0; border-bottom: 1px solid #e5e7eb;">${v.season}</td>
          <td style="padding: 4px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">$${sqFt > 0 ? perVisit.toLocaleString() : v.price}/visit</td>
        </tr>`,
    )
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 1em; font-size: 0.875em;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 4px 12px 4px 0; border-bottom: 2px solid #d1d5db;">Season</th>
          <th style="text-align: right; padding: 4px 0; border-bottom: 2px solid #d1d5db;">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `.trim();
}

function buildWebLeadTemplate(
  { sqFt, price, customerName, program }: CrmData,
  repFirstName: string,
): string {
  const sqFtDisplay = sqFt > 0 ? sqFt.toLocaleString() : "—";
  const priceDisplay = price > 0 ? `$${price.toLocaleString()}` : "—";
  const nameDisplay = customerName || "[Customer Name]";
  const repDisplay = repFirstName || "[Your Name]";

  const programColor = program === "preferred" ? "#166534" : program === "economy" ? "#1e40af" : "#374151";
  const programBg = program === "preferred" ? "#dcfce7" : program === "economy" ? "#dbeafe" : "#f3f4f6";
  const programText =
    program === "preferred"
      ? "Preferred Lawn Care Program"
      : program === "economy"
        ? "Economy Lawn Care Program"
        : "Lawn Care Program";
  // Use <mark> for background (Highlight extension) + <span style="color:..."> for text color (TextStyle/Color extensions)
  // Both are preserved by Tiptap's schema and survive setContent()
  const programLabel = `<mark style="background-color: ${programBg}; border-radius: 9999px; padding: 2px 8px;"><span style="color: ${programColor}; font-weight: 600;">${programText}</span></mark>`;

  const visits = program === "preferred" ? PREFERRED_VISITS : program === "economy" ? ECONOMY_VISITS : null;
  const visitTableHtml = visits ? buildVisitTable(visits, sqFt, price) : "";

  return `
    <p>Hi ${nameDisplay},</p>
    <p>Thanks for reaching out through our website! We'd love to help keep your lawn looking its best.</p>
    <p>Based on a lawn size of <strong>${sqFtDisplay} sq ft</strong>, our <strong>${programLabel}</strong> is priced at just <strong>${priceDisplay}/visit</strong> — that includes fertilization, weed control, and a free lawn analysis.</p>
    ${visitTableHtml}
    <p>We're currently booking new customers in your area. Would you like to get started this week?</p>
    <p>Looking forward to hearing from you,<br/>${repDisplay}<br/>Sunrise Green Lawn Care</p>
  `.trim();
}

type Props = {
  crmData: CrmData;
};

export function Editor({ crmData }: Props) {
  const repFirstName = useSelector(authSelect.user)?.firstName ?? "";
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!editor) return;
    const html = editor.getHTML();
    const text = editor.getText();
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: buildWebLeadTemplate(crmData, repFirstName),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-full p-4",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(buildWebLeadTemplate(crmData, repFirstName));
  }, [editor, crmData, repFirstName]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end border-b border-border bg-card px-3 py-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {copied ? "✓ Copied!" : "Copy to Clipboard"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto rounded-b-md bg-card">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
