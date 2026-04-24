"use client";

import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table,
  Columns2,
  Rows2,
  Trash2,
  BetweenHorizonalEnd,
  BetweenVerticalEnd,
  BetweenHorizonalStart,
  BetweenVerticalStart,
} from "lucide-react";
import { Button } from "@/style/components/button";

type Props = {
  editor: Editor | null;
};

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <Button
      size="sm"
      variant="accent"
      intensity={active ? "soft" : "ghost"}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-6 w-6 p-0 shrink-0"
      type="button"
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border mx-0.5 shrink-0" />;
}

export function EditorToolbar({ editor }: Props) {
  // useEditorState subscribes to every transaction so active-state checks
  // re-evaluate on every cursor move / selection change, preventing stale reads.
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          isBold: false,
          isItalic: false,
          isStrike: false,
          isH1: false,
          isH2: false,
          isH3: false,
          isBullet: false,
          isOrdered: false,
          isBlockquote: false,
          inTable: false,
        };
      }
      return {
        isBold: ctx.editor.isActive("bold"),
        isItalic: ctx.editor.isActive("italic"),
        isStrike: ctx.editor.isActive("strike"),
        isH1: ctx.editor.isActive("heading", { level: 1 }),
        isH2: ctx.editor.isActive("heading", { level: 2 }),
        isH3: ctx.editor.isActive("heading", { level: 3 }),
        isBullet: ctx.editor.isActive("bulletList"),
        isOrdered: ctx.editor.isActive("orderedList"),
        isBlockquote: ctx.editor.isActive("blockquote"),
        // isActive("table") only fires when the table node itself is selected;
        // tableCell/tableHeader fires whenever the cursor is inside a cell.
        inTable: ctx.editor.isActive("tableCell") || ctx.editor.isActive("tableHeader"),
      };
    },
  });

  const disabled = !editor;
  const { isBold, isItalic, isStrike, isH1, isH2, isH3, isBullet, isOrdered, isBlockquote, inTable } = editorState ?? {
    isBold: false, isItalic: false, isStrike: false,
    isH1: false, isH2: false, isH3: false,
    isBullet: false, isOrdered: false, isBlockquote: false,
    inTable: false,
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 px-2 py-1">

      {/* ── Text formatting ── */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBold().run()}
        active={isBold}
        disabled={disabled}
        title="Bold"
      >
        <Bold className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        active={isItalic}
        disabled={disabled}
        title="Italic"
      >
        <Italic className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        active={isStrike}
        disabled={disabled}
        title="Strikethrough"
      >
        <Strikethrough className="h-3 w-3" />
      </ToolbarButton>

      <Divider />

      {/* ── Headings ── */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        active={isH1}
        disabled={disabled}
        title="Heading 1"
      >
        <Heading1 className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        active={isH2}
        disabled={disabled}
        title="Heading 2"
      >
        <Heading2 className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        active={isH3}
        disabled={disabled}
        title="Heading 3"
      >
        <Heading3 className="h-3 w-3" />
      </ToolbarButton>

      <Divider />

      {/* ── Lists & blockquote ── */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        active={isBullet}
        disabled={disabled}
        title="Bullet list"
      >
        <List className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        active={isOrdered}
        disabled={disabled}
        title="Ordered list"
      >
        <ListOrdered className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        active={isBlockquote}
        disabled={disabled}
        title="Blockquote"
      >
        <Quote className="h-3 w-3" />
      </ToolbarButton>

      <Divider />

      {/* ── Table — insert ── */}
      <ToolbarButton
        onClick={() =>
          editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()
        }
        active={inTable}
        disabled={disabled}
        title="Insert table"
      >
        <Table className="h-3 w-3" />
      </ToolbarButton>

      {/* ── Table — column controls (only when inside a table) ── */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().addColumnBefore().run()}
        disabled={disabled || !inTable}
        title="Add column before"
      >
        <BetweenVerticalStart className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().addColumnAfter().run()}
        disabled={disabled || !inTable}
        title="Add column after"
      >
        <BetweenVerticalEnd className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().deleteColumn().run()}
        disabled={disabled || !inTable}
        title="Delete column"
      >
        <Columns2 className="h-3 w-3" />
      </ToolbarButton>

      <Divider />

      {/* ── Table — row controls ── */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().addRowBefore().run()}
        disabled={disabled || !inTable}
        title="Add row before"
      >
        <BetweenHorizonalStart className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().addRowAfter().run()}
        disabled={disabled || !inTable}
        title="Add row after"
      >
        <BetweenHorizonalEnd className="h-3 w-3" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor?.chain().focus().deleteRow().run()}
        disabled={disabled || !inTable}
        title="Delete row"
      >
        <Rows2 className="h-3 w-3" />
      </ToolbarButton>

      <Divider />

      {/* ── Table — delete table ── */}
      <ToolbarButton
        onClick={() => editor?.chain().focus().deleteTable().run()}
        disabled={disabled || !inTable}
        title="Delete table"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </ToolbarButton>
    </div>
  );
}
