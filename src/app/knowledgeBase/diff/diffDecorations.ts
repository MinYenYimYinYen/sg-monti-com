import type { Change } from "@tiptap/pm/changeset";
import { DOMSerializer, type Node as ProseMirrorNode, type Slice } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// Turns the changes between two versions into decorations on the newer document, so the diff is drawn by
// the same renderer as the document itself: tables, lists and marks look right, and no markup is compared
// as text. Added text is highlighted in place. Removed content is not in the newer document, so it is drawn
// from the older one and inserted where it used to be.

const ADDED_CLASS = "rounded-sm bg-accent/20";
const REMOVED_INLINE_CLASS = "rounded-sm bg-destructive/20 text-muted-foreground line-through";
const REMOVED_BLOCK_CLASS = "my-1 rounded-sm bg-destructive/20 text-muted-foreground line-through";

/** Text of removed blocks, flattened into one line, for a removal that only cuts across part of a block. */
function appendInlineContent({
  content,
  parent,
  serializer,
}: {
  content: ProseMirrorNode["content"];
  parent: HTMLElement;
  serializer: DOMSerializer;
}) {
  content.forEach((node, _offset, index) => {
    if (node.isInline) {
      parent.appendChild(serializer.serializeNode(node));
    } else if (node.isTextblock) {
      serializer.serializeFragment(node.content, {}, parent);
      if (index < content.childCount - 1) parent.appendChild(document.createTextNode(" "));
    } else {
      appendInlineContent({ content: node.content, parent, serializer });
    }
  });
}

/**
 * Draws removed content. A removal of whole blocks becomes a block of its own. A removal that cuts
 * through the middle of a block cannot be one, so it is drawn inline and its blocks run together.
 */
function renderRemoved({ slice, serializer }: { slice: Slice; serializer: DOMSerializer }): HTMLElement {
  const isWholeBlocks = slice.openStart === 0 && slice.openEnd === 0 && slice.content.firstChild?.isBlock === true;
  const wrapper = document.createElement(isWholeBlocks ? "div" : "span");
  wrapper.className = isWholeBlocks ? REMOVED_BLOCK_CLASS : REMOVED_INLINE_CLASS;
  wrapper.setAttribute("data-diff", "removed");
  if (isWholeBlocks) serializer.serializeFragment(slice.content, {}, wrapper);
  else appendInlineContent({ content: slice.content, parent: wrapper, serializer });
  return wrapper;
}

export function buildDiffDecorations({
  oldDoc,
  newDoc,
  changes,
}: {
  oldDoc: ProseMirrorNode;
  newDoc: ProseMirrorNode;
  changes: readonly Change[];
}): DecorationSet {
  const serializer = DOMSerializer.fromSchema(oldDoc.type.schema);
  const decorations: Decoration[] = [];

  for (const change of changes) {
    if (change.toB > change.fromB) {
      decorations.push(Decoration.inline(change.fromB, change.toB, { class: ADDED_CLASS }));
      // Inline decorations only reach text, so a block with none (a rule) is marked as a whole.
      newDoc.nodesBetween(change.fromB, change.toB, (node, pos) => {
        const isInsideChange = pos >= change.fromB && pos + node.nodeSize <= change.toB;
        if (isInsideChange && node.isBlock && node.isLeaf) {
          decorations.push(Decoration.node(pos, pos + node.nodeSize, { class: ADDED_CLASS }));
        }
      });
    }
    if (change.toA > change.fromA) {
      const slice = oldDoc.slice(change.fromA, change.toA);
      decorations.push(
        Decoration.widget(change.fromB, () => renderRemoved({ slice, serializer }), {
          side: -1,
          key: `removed-${change.fromA}-${change.toA}`,
        }),
      );
    }
  }

  return DecorationSet.create(newDoc, decorations);
}
