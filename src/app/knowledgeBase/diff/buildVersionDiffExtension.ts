import { createDocument, Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { DecorationSet } from "@tiptap/pm/view";
import { buildDiffDecorations } from "@/app/knowledgeBase/diff/diffDecorations";
import { diffDocuments } from "@/app/knowledgeBase/diff/documentDiffLogic";

const versionDiffKey = new PluginKey<DecorationSet>("versionDiff");

/**
 * Marks what changed between `oldHtml` and the document the editor holds. The older body is parsed with
 * the editor's own schema, so both sides are the same kind of node and their positions are the ones
 * on screen. The document never changes (the viewer is read only), so the marks are worked out once.
 */
export function buildVersionDiffExtension(oldHtml: string) {
  return Extension.create({
    name: "versionDiff",
    addProseMirrorPlugins() {
      return [
        new Plugin<DecorationSet>({
          key: versionDiffKey,
          state: {
            init(_config, state) {
              const oldDoc = createDocument(oldHtml, state.schema);
              const changes = diffDocuments({ oldDoc, newDoc: state.doc });
              return buildDiffDecorations({ oldDoc, newDoc: state.doc, changes });
            },
            apply(_transaction, decorations) {
              return decorations;
            },
          },
          props: {
            decorations(state) {
              return versionDiffKey.getState(state);
            },
          },
        }),
      ];
    },
  });
}
