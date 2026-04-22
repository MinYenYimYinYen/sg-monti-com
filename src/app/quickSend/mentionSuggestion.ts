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

/**
 * Given an alias (e.g. "MLC_2", "MLC_3_2") and the known progCodes, returns
 * the progCodeId that the alias was derived from.
 *
 * Strategy:
 * 1. Exact match — the alias IS a real progCodeId (handles progCodeIds that
 *    already contain underscores/digits, e.g. "MLC_3").
 * 2. Last-underscore strip — if the trailing segment after the last "_" is
 *    all digits, strip it. This recovers "MLC" from "MLC_2" and "MLC_3" from
 *    "MLC_3_2" without needing to know the full progCode list.
 * 3. Fallback — return the alias unchanged.
 */
export function safelyRemoveSuffix(alias: string, progCodes: ProgCode[]): string {
  const exact = progCodes.find(
    (p) => p.progCodeId.toLowerCase() === alias.toLowerCase(),
  );
  if (exact) return exact.progCodeId;

  const lastUnderscore = alias.lastIndexOf("_");
  if (lastUnderscore !== -1 && /^\d+$/.test(alias.slice(lastUnderscore + 1))) {
    return alias.slice(0, lastUnderscore);
  }
  return alias;
}

/** The top-level "program" namespace item. */
const PROGRAM_NS_ITEM: MentionItem = {
  id: "__ns__program",
  label: "program",
  isNamespace: true,
};

type BuildMentionSuggestionParams = {
  getProgCodes: () => ProgCode[];
  /** Returns the set of aliases currently in programConfigs (e.g. {"MLC", "MLC_2"}). */
  getExistingAliases: () => Set<string>;
  onProgramMentionInserted: (alias: string) => void;
};

/**
 * Builds the Tiptap suggestion config for @variable mentions.
 *
 * Three-level drill-down:
 * - Level 0 (no dot): flat vars (name, size) + "program →"
 * - Level 1 (query = "program.*"): progCode namespace items (MLC →, TLC →, ...)
 * - Level 2 (query = "program.MLC.*"): leaf properties (description, price, ...)
 *
 * Namespace items replace the typed text with "@{prefix}." and keep the
 * suggestion open (IDE-style autocomplete). Leaf items insert a mention node
 * with id "program.{progCodeId}.{prop}".
 */
export function buildMentionSuggestion({
  getProgCodes,
  getExistingAliases,
  onProgramMentionInserted,
}: BuildMentionSuggestionParams): Partial<SuggestionOptions> {
  return {
    items({ query }): MentionItem[] {
      const parts = query.split(".");

      // Level 0: no dot yet — show flat vars + "program →"
      if (parts.length === 1) {
        const q = query.toLowerCase();
        const flatMatches = FLAT_ITEMS.filter((item) =>
          item.label.toLowerCase().startsWith(q),
        );
        const programNsMatch = "program".startsWith(q) ? [PROGRAM_NS_ITEM] : [];
        return [...flatMatches, ...programNsMatch];
      }

      // Level 1: "program.{partial}" — show progCode namespace items.
      // For each progCode, show the base alias (e.g. "MLC") plus any "_N" variants
      // that are needed when the base alias is already in use.
      if (parts.length === 2 && parts[0].toLowerCase() === "program") {
        const suffix = parts[1].toLowerCase();
        const items: MentionItem[] = [];
        for (const p of getProgCodes()) {
          // Always show the base alias
          if (p.progCodeId.toLowerCase().startsWith(suffix)) {
            items.push({
              id: `__ns__program.${p.progCodeId}`,
              label: p.progCodeId,
              isNamespace: true,
            });
          }
          // If the base alias is already in programConfigs, also offer the next available _N alias
          const existingAliases = getExistingAliases(); // eslint-disable-line react-hooks/refs
          if (existingAliases.has(p.progCodeId)) {
            let n = 2;
            while (existingAliases.has(`${p.progCodeId}_${n}`)) n++;
            const nextAlias = `${p.progCodeId}_${n}`;
            if (nextAlias.toLowerCase().startsWith(suffix)) {
              items.push({
                id: `__ns__program.${nextAlias}`,
                label: nextAlias,
                isNamespace: true,
              });
            }
          }
        }
        return items;
      }

      // Level 2: "program.{alias}.{partial}" — show leaf properties.
      // The alias may be "MLC" or "MLC_2"; strip the _N suffix to find the base progCodeId.
      if (parts.length === 3 && parts[0].toLowerCase() === "program") {
        const alias = parts[1];
        const suffix = parts[2].toLowerCase();
        const baseProgCodeId = safelyRemoveSuffix(alias, getProgCodes());
        const progCode = getProgCodes().find(
          (p) => p.progCodeId.toLowerCase() === baseProgCodeId.toLowerCase(),
        );
        if (!progCode) return [];

        return PROG_LEAF_PROPS.filter((prop) =>
          prop.toLowerCase().startsWith(suffix),
        ).map((prop) => ({
          id: `program.${alias}.${prop}`,
          label: `${alias}.${prop}`,
        }));
      }

      return [];
    },

    command({ editor, range, props }) {
      if (props.isNamespace) {
        // Namespace item: replace typed text with "@{prefix}." and keep suggestion open
        const nsId: string = props.id; // e.g. "__ns__program" or "__ns__program.MLC"
        const prefix = nsId.replace(/^__ns__/, ""); // "program" or "program.MLC"
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent(`@${prefix}.`)
          .run();
        return;
      }

      // Leaf item: insert mention node without trailing space
      // id format: "program.{progCodeId}.{prop}"
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
      // id = "program.MLC.price" → progCodeId = "MLC"
      const parts = props.id.split(".");
      if (parts.length === 3 && parts[0] === "program") {
        onProgramMentionInserted(parts[1]);
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
