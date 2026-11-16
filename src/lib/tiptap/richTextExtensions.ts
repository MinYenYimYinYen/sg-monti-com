import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";

/**
 * The rich text nodes and marks every editor in the app shares. An editor adds its own extensions
 * (mentions, line height, paragraph spacing) after these. A function, not a constant, so each
 * editor gets its own instances. The HTML an editor saves can only contain what these and its own
 * extensions can produce, so a consumer that converts that HTML starts from this list.
 */
export function buildRichTextExtensions(): Extensions {
  return [
    StarterKit,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
  ];
}
