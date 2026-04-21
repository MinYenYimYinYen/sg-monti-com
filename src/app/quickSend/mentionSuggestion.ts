import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList } from "./MentionList";

/** The available @variable items. */
const MENTION_ITEMS = [
  { id: "name", label: "name" },
  { id: "size", label: "size" },
];

/**
 * Builds the Tiptap suggestion config for @variable mentions.
 * Uses a React-rendered dropdown via tippy.js.
 */
export function buildMentionSuggestion(): Partial<SuggestionOptions> {
  return {
    items({ query }) {
      return MENTION_ITEMS.filter((item) =>
        item.label.toLowerCase().startsWith(query.toLowerCase()),
      );
    },

    // Override default command to insert mention WITHOUT a trailing space.
    // Tiptap's default inserts a space node after the mention automatically.
    command({ editor, range, props }) {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "mention",
            attrs: { id: props.id, label: props.label },
          },
        ])
        .run();
    },

    render() {
      let component: ReactRenderer;
      let popup: TippyInstance[];

      return {
        onStart(props) {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

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

        onUpdate(props) {
          component.updateProps(props);
          if (!props.clientRect) return;
          popup[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup[0]?.hide();
            return true;
          }
          // Forward key events to the list component
          return (component.ref as { onKeyDown?: (p: { event: KeyboardEvent }) => boolean })
            ?.onKeyDown?.(props) ?? false;
        },

        onExit() {
          popup[0]?.destroy();
          component.destroy();
        },
      };
    },
  };
}
