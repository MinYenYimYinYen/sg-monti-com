import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList } from "./MentionList";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type { ProgLeafKey } from "../QuickSendTypes";

export type MentionItem = {
  id: string;
  label: string;
  isNamespace?: boolean;
};

/**
 * Exhaustiveness helper — ensures `PROG_LEAF_PROPS` covers every `ProgLeafKey`.
 */
type AssertExhaustiveLeafProps<T extends readonly ProgLeafKey[]> =
  T[number] extends ProgLeafKey
    ? ProgLeafKey extends T[number]
      ? T
      : never
    : never;

function exhaustiveProgLeafProps<T extends readonly ProgLeafKey[]>(
  arr: AssertExhaustiveLeafProps<T>,
): T {
  return arr;
}

/**
 * Leaf properties available on both `@loop.*` and `@{progCodeId}.*` namespaces.
 * Must stay in sync with `ProgLeafKey`.
 */
const PROG_LEAF_PROPS = exhaustiveProgLeafProps([
  "description",
  "servCount",
  "prefPrice",
  "econPrice",
  "servPrice",
  "subTotal",
  "prepayPercent",
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
];

/** Reserved namespace names that cannot be used as progCode IDs. */
const RESERVED_NAMESPACES = new Set(["loop", "totals"]);

type BuildMentionSuggestionParams = {
  /** Returns the currently selected programs (for dynamic namespace items). */
  getSelectedProgCodes: () => ProgCode[];
  /** Returns the set of aux IDs currently present in the template HTML. */
  getExistingAuxIds: () => Set<string>;
};

/**
 * Builds the Tiptap suggestion config for @variable mentions in QuickSend2.
 *
 * Mention ID formats:
 * - Flat vars: `name`, `size`, `taxRate`, `season`, `sgBillpayInfo`
 * - Aux slots: `aux`, `aux_2`, `aux_3`, …
 * - Loop vars: `loop.{prop}` (cloned once per selected program)
 * - Program-specific: `{progCodeId}.{prop}` (direct reference, only for selected programs)
 * - Aggregates: `totals.{prop}`
 *
 * Suggestion levels:
 * - Level 0: flat vars + aux + `loop →` + `totals →` + one namespace per selected program
 * - Level 1 off `loop`: loop props (no servTable)
 * - Level 1 off `totals`: aggregate props
 * - Level 1 off `{progCodeId}`: program props + servTable
 */
export function buildMentionSuggestion({
  getSelectedProgCodes,
  getExistingAuxIds,
}: BuildMentionSuggestionParams): Partial<SuggestionOptions> {
  return {
    items({ query }): MentionItem[] {
      const parts = query.split(".");

      // Level 0: no dot yet
      if (parts.length === 1) {
        const q = query.toLowerCase();

        const flatMatches = FLAT_ITEMS.filter((item) =>
          item.label.toLowerCase().startsWith(q),
        );

        // Aux items: always show "aux"; show "aux_2" if "aux" is already used, etc.
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

        // Reserved namespaces
        const loopNs: MentionItem[] = "loop".startsWith(q)
          ? [{ id: "__ns__loop", label: "loop", isNamespace: true }]
          : [];
        const totalsNs: MentionItem[] = "totals".startsWith(q)
          ? [{ id: "__ns__totals", label: "totals", isNamespace: true }]
          : [];

        // One namespace item per currently-selected program
        const progNsItems: MentionItem[] = getSelectedProgCodes()
          .filter((p) => p.progCodeId.toLowerCase().startsWith(q))
          .map((p) => ({
            id: `__ns__${p.progCodeId}`,
            label: p.progCodeId,
            isNamespace: true,
          }));

        return [...flatMatches, ...auxMatches, ...loopNs, ...totalsNs, ...progNsItems];
      }

      // Level 1 off `loop`: loop props (no servTable — not meaningful in a loop row)
      if (parts.length === 2 && parts[0].toLowerCase() === "loop") {
        const suffix = parts[1].toLowerCase();
        return PROG_LEAF_PROPS.filter((prop) =>
          prop.toLowerCase().startsWith(suffix),
        ).map((prop) => ({
          id: `loop.${prop}`,
          label: `loop.${prop}`,
        }));
      }

      // Level 1 off `totals`: aggregate props
      if (parts.length === 2 && parts[0].toLowerCase() === "totals") {
        const suffix = parts[1].toLowerCase();
        const aggregateProps = ["subTotal", "prepayDiscAmt", "taxAmt", "total"] as const;
        return aggregateProps
          .filter((prop) => prop.toLowerCase().startsWith(suffix))
          .map((prop) => ({
            id: `totals.${prop}`,
            label: `totals.${prop}`,
          }));
      }

      // Level 1 off `{progCodeId}`: program-specific props + servTable
      if (parts.length === 2) {
        const progCodeId = parts[0];
        const suffix = parts[1].toLowerCase();

        // Only expose if this progCode is currently selected and not a reserved name
        if (RESERVED_NAMESPACES.has(progCodeId.toLowerCase())) return [];
        const isSelected = getSelectedProgCodes().some(
          (p) => p.progCodeId.toLowerCase() === progCodeId.toLowerCase(),
        );
        if (!isSelected) return [];

        const leafItems: MentionItem[] = PROG_LEAF_PROPS.filter((prop) =>
          prop.toLowerCase().startsWith(suffix),
        ).map((prop) => ({
          id: `${progCodeId}.${prop}`,
          label: `${progCodeId}.${prop}`,
        }));

        const servTableItem: MentionItem[] = "servTable".startsWith(suffix)
          ? [{ id: `${progCodeId}.servTable`, label: `${progCodeId}.servTable` }]
          : [];

        return [...leafItems, ...servTableItem];
      }

      return [];
    },

    command({ editor, range, props }) {
      if (props.isNamespace) {
        // Namespace item: replace typed text with "@{prefix}." and keep suggestion open
        const prefix = props.id.replace(/^__ns__/, "");
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
