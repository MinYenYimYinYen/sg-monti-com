/**
 * Converts camelCase or PascalCase to a readable string,
 * handling acronyms and capitalizing the first letter.
 */
export function camelDisplay(str: string) {

  return (
    str
      // 1. Insert space before capitals that follow lowercase letters
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // 2. Insert space before the start of a new word after an acronym
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
      // 3. Capitalize the very first letter
      .replace(/^./, (match) => match.toUpperCase())
      .trim()
  );
}
