import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList } from "./MentionList";
import type { FlatMentionItem, FlatVars } from "./MentionEditorUtils";
import { MentionEditorUtils } from "./MentionEditorUtils";

type BuildFlatMentionSuggestionParams<T extends FlatVars> = {
  /** Returns the current vars object — called on every keystroke so it always reads fresh state. */
  getVars: () => T;
};

/**
 * Builds a Tiptap suggestion config for flat @ variable mentions.
 *
 * Unlike the QuickSend mention system (which has namespaces, loops, and program-specific vars),
 * this is a simple flat list: every key of T is a valid mention id.
 *
 * Suggestion items are derived from `Object.keys(getVars())` filtered by the current query.
 */
export function buildFlatMentionSuggestion<T extends FlatVars>({
  getVars,
}: BuildFlatMentionSuggestionParams<T>): Partial<SuggestionOptions> {
  return {
    items({ query }): FlatMentionItem[] {
      return MentionEditorUtils.getSuggestionItems(getVars(), query);
    },

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
          return (
            (
              component.ref as {
                onKeyDown?: (p: { event: KeyboardEvent }) => boolean;
              }
            )?.onKeyDown?.(props) ?? false
          );
        },

        onExit() {
          popup[0]?.destroy();
          component.destroy();
        },
      };
    },
  };
}
