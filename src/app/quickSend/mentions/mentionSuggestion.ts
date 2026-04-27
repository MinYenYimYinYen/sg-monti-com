import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList } from "./MentionList";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type { PrepayDoc } from "@/app/realGreen/prepay/PrepayTypes";
import type { QSProgLeafKey } from "../QuickSendTypes";

export type MentionItem = {
  id: string;
  label: string;
  isNamespace?: boolean;
};

/**
 * Exhaustiveness helper — ensures `PROG_LEAF_PROPS` covers every `QSProgLeafKey`.
 * If a key is added to or renamed on `QSProgramVariables` (and therefore `QSProgLeafKey`),
 * TypeScript will error here until the array is updated to match.
 */
type AssertExhaustiveLeafProps<T extends readonly QSProgLeafKey[]> =
  T[number] extends QSProgLeafKey
    ? QSProgLeafKey extends T[number]
      ? T
      : never
    : never;

function exhaustiveProgLeafProps<T extends readonly QSProgLeafKey[]>(
  arr: AssertExhaustiveLeafProps<T>,
): T {
  return arr;
}

/** Leaf properties available on a program namespace. Must stay in sync with `QSProgLeafKey`. */
const PROG_LEAF_PROPS = exhaustiveProgLeafProps([
  "description",
  "servCount",
  "prefPrice",
  "econPrice",
  "servPrice",
  "subTotal",
  "prepayDiscAmt",
  "taxAmt",
  "total",
] as const);

/** The flat (non-namespaced) @variable items. */
const FLAT_ITEMS: MentionItem[] = [
  { id: "name", label: "name" },
  { id: "size", label: "size" },
  { id: "taxRate", label: "taxRate" },
  { id: "season", label: "season" },
  { id: "sgBillpayInfo", label: "sgBillpayInfo" },
  { id: "progChooser", label: "progChooser" },
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

/** The top-level "p" namespace item (loop variable for progChooser). */
const P_NS_ITEM: MentionItem = {
  id: "__ns__p",
  label: "p",
  isNamespace: true,
};

/** The "prepay" leaf shown at Level 2 (inside a program alias). */
const PREPAY_LEAF_ID_SUFFIX = "prepay";

type BuildMentionSuggestionParams = {
  getProgCodes: () => ProgCode[];
  // getPrepayCodes: () => PrepayDoc[];
  /** Returns the set of aliases currently in programConfigs (e.g. {"MLC", "MLC_2"}). */
  getExistingAliases: () => Set<string>;
  onProgramMentionInserted: (alias: string) => void;
  /** Returns the set of aux IDs currently present in the template HTML (e.g. {"aux", "aux_2"}). */
  getExistingAuxIds: () => Set<string>;
};

/**
 * Builds the Tiptap suggestion config for @variable mentions.
 *
 * Mention ID formats:
 * - Flat vars: `name`, `size`, `taxRate`, `season`, `sgBillpayInfo`
 * - Aux slots: `aux`, `aux_2`, `aux_3`, … (direct leaf items at Level 0)
 * - Program leaves: `program.{alias}.{prop}` (3-level drill-down via namespace items)
 *
 * Namespace items replace the typed text with "@{prefix}." and keep the
 * suggestion open (IDE-style autocomplete). Leaf items insert a mention node.
 */
export function buildMentionSuggestion({
  getProgCodes,
  getExistingAliases,
  onProgramMentionInserted,
  getExistingAuxIds,
}: BuildMentionSuggestionParams): Partial<SuggestionOptions> {
  return {
    items({ query }): MentionItem[] {
      const parts = query.split(".");

      // Level 0: no dot yet — show flat vars + aux leaf items + "program →"
      if (parts.length === 1) {
        const q = query.toLowerCase();

        const flatMatches = FLAT_ITEMS.filter((item) =>
          item.label.toLowerCase().startsWith(q),
        );

        // Aux items are direct leaves. Always show "aux"; show "aux_2" if "aux" is
        // already in the template, "aux_3" if both are used, etc.
        const existingAuxIds = getExistingAuxIds();
        const auxCandidates: string[] = ["aux"];
        let n = 2;
        while (existingAuxIds.has(auxCandidates[auxCandidates.length - 1])) {
          auxCandidates.push(`aux_${n}`);
          n++;
        }
        const auxMatches: MentionItem[] = auxCandidates
          .filter((id) => id.toLowerCase().startsWith(q))
          .map((id) => ({ id, label: id }));

      const programNsMatch = "program".startsWith(q) ? [PROGRAM_NS_ITEM] : [];
        const pNsMatch = "p".startsWith(q) ? [P_NS_ITEM] : [];

        return [...flatMatches, ...auxMatches, ...programNsMatch, ...pNsMatch];
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
          const existingAliases = getExistingAliases();
          if (existingAliases.has(p.progCodeId)) {
            let m = 2;
            while (existingAliases.has(`${p.progCodeId}_${m}`)) m++;
            const nextAlias = `${p.progCodeId}_${m}`;
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

      // Level 1: "p.{partial}" — show loop-variable leaf properties (same set as program leaves).
      if (parts.length === 2 && parts[0].toLowerCase() === "p") {
        const suffix = parts[1].toLowerCase();

        const leafItems: MentionItem[] = PROG_LEAF_PROPS.filter((prop) =>
          prop.toLowerCase().startsWith(suffix),
        ).map((prop) => ({
          id: `p.${prop}`,
          label: `p.${prop}`,
        }));

        const prepayLeafItems: MentionItem[] =
          "prepay".startsWith(suffix)
            ? [{ id: "p.prepay", label: "p.prepay" }]
            : [];

        const servTableLeafItems: MentionItem[] =
          "servTable".startsWith(suffix)
            ? [{ id: "p.servTable", label: "p.servTable" }]
            : [];

        return [...leafItems, ...prepayLeafItems, ...servTableLeafItems];
      }

      // Level 2: "program.{alias}.{partial}" — show leaf properties + "prepay" + "servTable".
      // The alias may be "MLC" or "MLC_2"; strip the _N suffix to find the base progCodeId.
      if (parts.length === 3 && parts[0].toLowerCase() === "program") {
        const alias = parts[1];
        const suffix = parts[2].toLowerCase();
        const baseProgCodeId = safelyRemoveSuffix(alias, getProgCodes());
        const progCode = getProgCodes().find(
          (p) => p.progCodeId.toLowerCase() === baseProgCodeId.toLowerCase(),
        );
        if (!progCode) return [];

        const leafItems: MentionItem[] = PROG_LEAF_PROPS.filter((prop) =>
          prop.toLowerCase().startsWith(suffix),
        ).map((prop) => ({
          id: `program.${alias}.${prop}`,
          label: `${alias}.${prop}`,
        }));

        // Add "prepay" leaf item if it matches the partial
        const prepayLeafItems: MentionItem[] =
          PREPAY_LEAF_ID_SUFFIX.startsWith(suffix)
            ? [{ id: `program.${alias}.prepay`, label: `${alias}.prepay` }]
            : [];

        // Add "servTable" block mention if it matches the partial
        const servTableLeafItems: MentionItem[] =
          "servTable".startsWith(suffix)
            ? [{ id: `program.${alias}.servTable`, label: `${alias}.servTable` }]
            : [];

        return [...leafItems, ...prepayLeafItems, ...servTableLeafItems];
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

      // Notify so the slice can auto-add a programConfig when a program leaf is inserted.
      // id = "program.MLC.price" → alias = "MLC"
      // id = "program.MLC.prepay" → alias = "MLC" (also triggers programConfig)
      const parts = props.id.split(".");
      if (parts.length >= 3 && parts[0] === "program") {
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
