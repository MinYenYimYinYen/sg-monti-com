/**
 * MentionEditorUtils — generic utilities for the flat-variable mention editor.
 *
 * Design constraints:
 * - T must be a flat record of `string | number` values only (enforced via FlatVars).
 * - VarParsers<T> must cover every key of T — TypeScript errors if a key is missing.
 * - No class instances are needed at runtime; all methods are static.
 */

/** Constraint: T must be a flat record of string | number values. */
export type FlatVars = Record<string, string | number>;

/**
 * A parser record that must cover every key of T.
 * Each function receives the live value for that variable and returns a display string.
 *
 * Use `satisfies VarParsers<T>` at the call site to get exhaustiveness checking:
 * if a new key is added to T, TypeScript will error until a parser is provided.
 */
export type VarParsers<T extends FlatVars> = {
  [K in keyof T]: (value: T[K]) => string;
};

/** A single item in the @ mention suggestion dropdown. */
export type FlatMentionItem = {
  id: string;
  label: string;
};

export class MentionEditorUtils {
  /**
   * Resolves all mention nodes in tiptap HTML to their display strings, then
   * strips all remaining HTML tags to return plain text.
   *
   * Tiptap stores mention nodes as:
   *   <span data-type="mention" data-id="season">@season</span>
   *
   * This method replaces each such span with `parsers[id](vars[id])`, then
   * strips the remaining HTML tags.
   */
  static resolve<T extends FlatVars>(
    html: string,
    vars: T,
    parsers: VarParsers<T>,
  ): string {
    // Replace mention spans with resolved values before stripping tags.
    const resolved = html.replace(
      /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>.*?<\/span>/g,
      (_match, id: string) => {
        const key = id as keyof T;
        if (key in vars && key in parsers) {
          return parsers[key](vars[key]);
        }
        // Unknown variable — leave as the raw id so it's visible in output.
        return id;
      },
    );

    // Strip remaining HTML tags and decode basic entities.
    return resolved
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Builds the flat suggestion items list from the keys of a vars object.
   * Filters by the current query string (prefix match, case-insensitive).
   */
  static getSuggestionItems<T extends FlatVars>(
    vars: T,
    query: string,
  ): FlatMentionItem[] {
    const q = query.toLowerCase();
    return Object.keys(vars)
      .filter((key) => key.toLowerCase().startsWith(q))
      .map((key) => ({ id: key, label: key }));
  }

  /**
   * Resolves a single mention id to its display string using the provided vars and parsers.
   * Used by the MentionEditor component's renderHTML to show live values in "resolved" mode.
   * Returns the raw id if the key is not found.
   */
  static resolveOne<T extends FlatVars>(
    id: string,
    vars: T,
    parsers: VarParsers<T>,
  ): string {
    const key = id as keyof T;
    if (key in vars && key in parsers) {
      return parsers[key](vars[key]);
    }
    return id;
  }
}
