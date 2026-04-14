"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  CUSTOMER_VARIABLES,
  type CustomerVariableKey,
  GLOBAL_SETTINGS_VARIABLES,
  type GlobalSettingsVariableKey,
  PROG_CODE_VARIABLES,
  type ProgCodeVariableKey,
} from "@/app/quickSend/templates/dataFeatures/dataFeatureVariables";
import { cn } from "@/style/utils";

// ─── Suggestion items ───────────────────────────────────────────────────────

// The Mention extension stores the selected item's `id` attribute.
// We use `id` (not `key`) so `node.attrs.id` in renderHTML resolves correctly.
type VariableItem = {
  id: string; // Namespaced: "displayName", "globalSettings.season", "progCode.description"
  label: string;
};

function buildVariableItems(
  customerEnabled: boolean,
  seasonEnabled: boolean,
  progCodeEnabled: boolean,
): VariableItem[] {
  const items: VariableItem[] = [];

  if (customerEnabled) {
    items.push(
      ...(Object.entries(CUSTOMER_VARIABLES) as [CustomerVariableKey, string][]).map(
        ([key, label]) => ({
          id: key,
          label,
        })
      )
    );
  }

  if (seasonEnabled) {
    items.push(
      ...(Object.entries(GLOBAL_SETTINGS_VARIABLES) as [GlobalSettingsVariableKey, string][]).map(
        ([key, label]) => ({
          id: `globalSettings.${key}`,
          label,
        })
      )
    );
  }

  if (progCodeEnabled) {
    items.push(
      ...(Object.entries(PROG_CODE_VARIABLES) as [ProgCodeVariableKey, string][]).map(
        ([key, label]) => ({
          id: `progCode.${key}`,
          label,
        })
      )
    );
  }

  return items;
}

function filterItems(items: VariableItem[], query: string): VariableItem[] {
  return items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );
}

// ─── Suggestion list component ──────────────────────────────────────────────

interface SuggestionListProps {
  items: VariableItem[];
  command: (item: VariableItem) => void;
}

const SuggestionList = React.forwardRef<
  { onKeyDown: (event: KeyboardEvent) => boolean },
  SuggestionListProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  React.useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card shadow-md p-2 text-xs text-muted-foreground">
        No variables found
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card shadow-md overflow-hidden min-w-40">
      {items.map((item, index) => (
        <button
          key={item.id}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left",
            index === selectedIndex
              ? "bg-primary/10 text-foreground"
              : "hover:bg-muted/50 text-foreground/80",
          )}
          onClick={() => selectItem(index)}
        >
          <span className="text-[10px] font-semibold bg-accent/20 text-accent px-1 rounded shrink-0">
            var
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
});
SuggestionList.displayName = "SuggestionList";

// ─── Mention extension config ────────────────────────────────────────────────

function buildMentionExtension(customerEnabled: boolean, seasonEnabled: boolean, progCodeEnabled: boolean) {
  const variableItems = buildVariableItems(customerEnabled, seasonEnabled, progCodeEnabled);
  const enabled = customerEnabled || seasonEnabled || progCodeEnabled;

  return Mention.configure({
    HTMLAttributes: {
      class: "template-var",
    },
    // Store the variable key as the mention id; render as {{customer.<key>}} or {{globalSettings.<key>}}
    renderHTML({ node }) {
      const id = node.attrs.id;
      // If id already includes namespace (globalSettings.season), use as-is
      // Otherwise, prefix with customer. (displayName -> customer.displayName)
      const displayText = id.includes(".") ? `{{${id}}}` : `{{customer.${id}}}`;

      return [
        "span",
        {
          class:
            "template-var inline-flex items-center rounded px-1 py-0.5 text-[11px] font-semibold bg-accent/20 text-accent",
          "data-type": "mention",
          "data-id": id,
        },
        displayText,
      ];
    },
    suggestion: enabled
      ? {
          items: ({ query }) => filterItems(variableItems, query),
          // Custom command to insert mention WITHOUT trailing space
          command: ({ editor, range, props }) => {
            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: "mention",
                  attrs: { id: props.id, label: props.label },
                },
                // Don't add space - user can type it manually if needed
              ])
              .run();
          },
          render: () => {
            let component: ReactRenderer<
              { onKeyDown: (event: KeyboardEvent) => boolean },
              SuggestionListProps
            >;
            let popup: TippyInstance[];

            return {
              onStart: (props) => {
                component = new ReactRenderer(SuggestionList, {
                  props,
                  editor: props.editor,
                });

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate: (props) => {
                component.updateProps(props);
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  popup[0].hide();
                  return true;
                }
                // Tab confirms the current selection (prevent browser focus shift)
                if (props.event.key === "Tab") {
                  props.event.preventDefault();
                  // Synthesize an Enter event to trigger selectItem in SuggestionList
                  const enterEvent = new KeyboardEvent("keydown", {
                    key: "Enter",
                  });
                  return component.ref?.onKeyDown(enterEvent) ?? false;
                }
                return component.ref?.onKeyDown(props.event) ?? false;
              },
              onExit: () => {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        }
      : { items: () => [] },
  });
}

// ─── BlockContentEditor ──────────────────────────────────────────────────────

interface BlockContentEditorProps {
  /** Current HTML content of the block. */
  content: string;
  /** Called with updated HTML whenever the editor content changes. */
  onChange: (html: string) => void;
  /** Whether to allow multiple lines (paragraph) or suppress Enter (textLine). */
  multiLine?: boolean;
  /** Whether to enable customer variable @ mentions. */
  customerVariablesEnabled?: boolean;
  /** Whether to enable season variable @ mentions. */
  seasonVariableEnabled?: boolean;
  /** Whether to enable progCode scalar variable @ mentions. */
  progCodeVariablesEnabled?: boolean;
  placeholder?: string;
}

/**
 * A lightweight Tiptap editor for authoring a single content block.
 * Supports @ mentions for inserting {{customer.*}}, {{globalSettings.*}}, and {{progCode.*}} variable placeholders.
 * Stored content is HTML (Tiptap output) with placeholder spans inline.
 */
export function BlockContentEditor({
  content,
  onChange,
  multiLine = true,
  customerVariablesEnabled = false,
  seasonVariableEnabled = false,
  progCodeVariablesEnabled = false,
  placeholder,
}: BlockContentEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Suppress hard breaks in single-line mode
        hardBreak: multiLine ? undefined : false,
      }),
      buildMentionExtension(customerVariablesEnabled, seasonVariableEnabled, progCodeVariablesEnabled),
    ],
    content: content || "",
    editorProps: {
      attributes: {
        class: cn(
          "focus:outline-none text-sm text-foreground min-h-[2rem] px-3 py-2",
          !multiLine && "whitespace-nowrap overflow-hidden",
        ),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
      handleKeyDown: multiLine
        ? undefined
        : (_view, event) => {
            // Suppress Enter in single-line mode
            if (event.key === "Enter") {
              event.preventDefault();
              return true;
            }
            return false;
          },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring",
        multiLine ? "min-h-24" : "min-h-9",
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
