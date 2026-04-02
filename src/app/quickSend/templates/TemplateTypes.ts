export type TreeNodeType = "category" | "fragment";

export type TreeNodeDoc = {
  nodeId: string;
  parentId: string | null;
  label: string;
  type: TreeNodeType;
  order: number;
  fragment?: {
    blockId: string;
    /** Points to a componentRegistry entry for dynamic content generation. */
    registryKey?: string;
    /** Static Tiptap-compatible HTML. Used when no registry logic is needed. */
    body?: string;
    /** If this fragment sets the email subject line. */
    subject?: string;
  };
};
