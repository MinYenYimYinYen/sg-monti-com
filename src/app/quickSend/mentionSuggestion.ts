import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList } from "./MentionList";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

export type MentionItem = {
  id: string;
  label: string;
  isNamespace?: boolean;
};

/** Leaf properties available on a program namespace. */
const PROG_LEAF_PROPS = [
  "description",
  "servCount",
  "prefPrice",
  "econPrice",
  "price",
  "totalPrice",
] as const;

/** The flat (non-namespaced) @variable items. */
const FLAT_ITEMS: MentionItem[] = [
  { id: "name", label: "name" },
  { id: "size", label: "size" },
];

type BuildMentionSuggestionParams = {
  getProgCodes: () => ProgCode[];
  onProgramMentionInserted: (progCodeId: string) => void;
};

/**
 * Builds the Tiptap suggestion config for @variable mentions.
 *
 * Supports two-level drill-down:
 * - Before the dot: flat vars (name, size) + namespace items (MLC →, TLC →)
 * - After the dot (e.g. "MLC.serv"): leaf properties of the matched ProgCode
 *
 * Namespace items replace the typed text with "@{namespace}." and keep the
 * suggestion open (IDE-style autocomplete). Leaf items insert a mention node.
 */
export function buildMentionSuggestion({
  getProgCodes,
  onProgramMentionInserted,
}: BuildMentionSuggestionParams): Partial<SuggestionOptions> {
  return {
    items({ query }): MentionItem[] {
      const dotIndex = query.indexOf(".");

      if (dotIndex === -1) {
        // Before the dot: show flat vars + namespace items
        const q = query.toLowerCase();
        const flatMatches = FLAT_ITEMS.filter((item) =>
          item.label.toLowerCase().startsWith(q),
        );
        const namespaceMatches: MentionItem[] = getProgCodes()
          .filter((p) => p.progCodeId.toLowerCase().startsWith(q))
          .map((p) => ({
            id: `__ns__${p.progCodeId}`,
            label: p.progCodeId,
            isNamespace: true,
          }));
        return [...flatMatches, ...namespaceMatches];
      }

      // After the dot: show leaf properties for the matched namespace
      const namespace = query.slice(0, dotIndex);
      const suffix = query.slice(dotIndex + 1).toLowerCase();
      const progCode = getProgCodes().find(
        (p) => p.progCodeId.toLowerCase() === namespace.toLowerCase(),
      );
      if (!progCode) return [];

      return PROG_LEAF_PROPS.filter((prop) =>
        prop.toLowerCase().startsWith(suffix),
      ).map((prop) => ({
        id: `${progCode.progCodeId}.${prop}`,
        label: `${progCode.progCodeId}.${prop}`,
      }));
    },

    command({ editor, range, props }) {
      if (props.isNamespace) {
        // Namespace item: replace typed text with "@{namespace}." and keep suggestion open
        const namespace = props.label;
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent(`@${namespace}.`)
          .run();
        return;
      }

      // Leaf item: insert mention node without trailing space
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

      // Notify so the slice can auto-add a programConfig
      const dotIndex = props.id.indexOf(".");
      if (dotIndex !== -1) {
        const progCodeId = props.id.slice(0, dotIndex);
        onProgramMentionInserted(progCodeId);
      }
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
