"use client";

import React, { useState } from "react";
import { Button } from "@/style/components/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/style/utils";

interface OutputGroupProps {
  html: string;
  label?: string;
}

/**
 * Renders a single resolved output group as styled HTML with a Copy button.
 * Copies the raw HTML to clipboard (suitable for pasting into email clients
 * that accept HTML, or for use with a Tiptap editor).
 */
export function OutputGroup({ html, label }: OutputGroupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        {label && (
          <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
            {label}
          </span>
        )}
        <Button
          size="sm"
          variant={copied ? "accent" : "primary"}
          intensity="soft"
          onClick={handleCopy}
          className={cn("ml-auto gap-1.5", !label && "self-end")}
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

      {/* Rendered HTML preview */}
      <div
        className="rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
