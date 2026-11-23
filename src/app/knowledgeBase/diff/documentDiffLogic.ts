import { ChangeSet, simplifyChanges, type Change, type TokenEncoder } from "@tiptap/pm/changeset";
import type { Mark, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { StepMap } from "@tiptap/pm/transform";

// The difference between two ProseMirror documents. It needs no DOM, so it runs the same in a test.
// Both documents must come from one schema, because nodes of two schemas never compare equal.

const markKeys = new WeakMap<Mark, string>();

function keyOfMark(mark: Mark): string {
  let key = markKeys.get(mark);
  if (key === undefined) {
    key = `${mark.type.name}${JSON.stringify(mark.attrs)}`;
    markKeys.set(mark, key);
  }
  return key;
}

/**
 * The library's default compares text by character and nodes by name, so making a word bold, changing a
 * heading level or editing a link would read as no change. Folding marks and attributes into each token
 * makes those differences count. Plain characters stay numbers, which keeps the common case cheap.
 */
const diffTokenEncoder: TokenEncoder<string | number> = {
  encodeCharacter: (char, marks) => (marks.length === 0 ? char : `${char}|${marks.map(keyOfMark).join("|")}`),
  encodeNodeStart: (node) => `${node.type.name}${JSON.stringify(node.attrs)}`,
  encodeNodeEnd: (node) => `/${node.type.name}`,
  compareTokens: (a, b) => a === b,
};

/**
 * What changed going from `oldDoc` to `newDoc`, as ranges in both documents, widened to whole words so a
 * single edited word reads as one replacement. Empty when the documents are the same.
 */
export function diffDocuments({
  oldDoc,
  newDoc,
}: {
  oldDoc: ProseMirrorNode;
  newDoc: ProseMirrorNode;
}): readonly Change[] {
  if (oldDoc.eq(newDoc)) return [];
  // One step that replaces the whole document: the change set then diffs the two contents against each other.
  const wholeDocument = new StepMap([0, oldDoc.content.size, newDoc.content.size]);
  // The step data is never read, but it must be non-null and equal on every span, or the library
  // treats the spans as incompatible and keeps them apart.
  const changeSet = ChangeSet.create<number>(oldDoc, undefined, diffTokenEncoder).addSteps(newDoc, [wholeDocument], 0);
  return simplifyChanges(changeSet.changes, newDoc);
}
