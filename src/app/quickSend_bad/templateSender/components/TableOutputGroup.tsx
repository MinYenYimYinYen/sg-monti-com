"use client";

import React, { useState } from "react";
import { Button } from "@/style/components/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/style/utils";

interface TableOutputGroupProps {
  /** Resolved HTML table string from the template engine. */
  html: string;
  label?: string;
}

/**
 * Renders a table output group as plain HTML (not editable).
 * Tables are always re-generated from data, so no edit/reset is needed.
 * Copy button copies the table HTML + plain text.
 */
export function TableOutputGroup({ html, label }: TableOutputGroupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textContent = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([textContent], { type: "text/plain" }),
      }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Header row */}
      <div className="flex items-center gap-2 min-h-[1.75rem]">
        {label && (
          <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
            {label}
          </span>
        )}
        <span className="text-[10px] font-semibold bg-primary/20 text-primary px-1.5 py-0.5 rounded">
          TABLE
        </span>
        <Button
          size="sm"
          variant={copied ? "accent" : "primary"}
          intensity="soft"
          onClick={handleCopy}
          className={cn("ml-auto gap-1.5")}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Plain HTML table preview */}
      <div
        className="rounded-md border border-border bg-card shadow-sm px-4 py-3 text-sm text-foreground overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
