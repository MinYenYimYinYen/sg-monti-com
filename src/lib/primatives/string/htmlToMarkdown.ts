import TurndownService from "turndown";

const BULLET = "-";
const NESTED_LIST_GAP = /\n{2,}(?=(?:-|\d+\.) )/g;
const ESCAPED_PIPE = /\\\|/g;
const PIPE = /\|/g;

function listItemPrefix(node: HTMLElement): string {
  const parent = node.parentNode as HTMLElement | null;
  if (parent?.nodeName !== "OL") return `${BULLET} `;
  const start = Number(parent.getAttribute("start") ?? 1);
  const index = Array.prototype.indexOf.call(parent.children, node);
  return `${start + index}. `;
}

/** A markdown table row is one line, so a cell cannot hold line breaks or a bare pipe. */
function flattenCell(content: string): string {
  return content
    .replace(/\s*\n+\s*/g, " ")
    .replace(PIPE, "\\|")
    .trim();
}

function isBlockNode(node: HTMLElement): boolean {
  return (node as unknown as { isBlock?: boolean }).isBlock === true;
}

function buildService(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: BULLET,
    codeBlockStyle: "fenced",
    hr: "---",
    // An empty table cell or row must still count as a column, or the rows stop lining up.
    blankReplacement: (_content, node) => {
      if (node.nodeName === "TD" || node.nodeName === "TH") return " |";
      if (node.nodeName === "TR") return `|${" |".repeat(node.childNodes.length)}\n`;
      if (node.nodeName === "TABLE") return "";
      return isBlockNode(node) ? "\n\n" : "";
    },
  });

  service.addRule("strikethrough", {
    filter: (node) => ["DEL", "S", "STRIKE"].includes(node.nodeName),
    replacement: (content) => `~~${content}~~`,
  });

  // TipTap wraps list item text in <p>, which turndown would turn into a blank line between items.
  service.addRule("listItem", {
    filter: "li",
    replacement: (content, node) => {
      const prefix = listItemPrefix(node);
      const tight = content.trim().replace(NESTED_LIST_GAP, "\n");
      const indented = tight.replace(/\n(?=[^\n])/g, `\n${" ".repeat(prefix.length)}`);
      return `${prefix}${indented}${node.nextSibling ? "\n" : ""}`;
    },
  });

  service.addRule("tableCell", {
    filter: ["th", "td"],
    replacement: (content) => ` ${flattenCell(content)} |`,
  });
  service.addRule("tableRow", {
    filter: "tr",
    replacement: (content) => `|${content}\n`,
  });
  service.addRule("tableSection", {
    filter: ["thead", "tbody", "tfoot"],
    replacement: (content) => content,
  });
  service.addRule("tableColgroup", {
    filter: ["colgroup", "col"],
    replacement: () => "",
  });
  // The editor inserts tables without a header row, and markdown tables need one, so the first
  // row is always used as the header.
  service.addRule("table", {
    filter: "table",
    replacement: (content) => {
      const [header, ...rows] = content.trim().split("\n");
      if (!header) return "";
      const columns = Math.max(1, (header.replace(ESCAPED_PIPE, "").match(PIPE) ?? []).length - 1);
      const separator = `|${" --- |".repeat(columns)}`;
      return `\n\n${[header, separator, ...rows].join("\n")}\n\n`;
    },
  });

  return service;
}

const service = buildService();

/**
 * Converts TipTap HTML to markdown. Markdown has no equivalent for underline, color or highlight,
 * so those are dropped and the text kept. Same input always gives the same output.
 */
export function htmlToMarkdown(html: string): string {
  return service.turndown(html).trim();
}
