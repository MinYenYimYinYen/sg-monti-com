import { useJavelin } from "@/app/javelin/useJavelin";

/**
 * Everything the Javelin tabs share. Called only from layout.tsx. It loads what was last posted;
 * account links load on the Settings tab (AccountMappingPanel), because the server reads them
 * itself when it builds each entry.
 */
export function useJavelinDeps() {
  useJavelin({ autoLoad: true });
}
