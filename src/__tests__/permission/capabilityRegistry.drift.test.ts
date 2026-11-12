import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { capabilityRegistry, registeredFeatures } from "@/permission/capabilityRegistry";

// Every <feature>Capabilities.ts under src/app must be listed in capabilityRegistry.ts, so a
// feature cannot silently go missing from the admin UI and the unknown-string filter.
//
// The files are found by scanning the disk on every run. import.meta.glob was tried first, but
// Vitest reuses the transformed test module when the test file is unchanged, so a newly added
// declaration file was not seen until the test file itself was edited.
const APP_DIR = path.resolve(__dirname, "../../app");

function findDeclarationFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((directoryEntry) => {
    const fullPath = path.join(directory, directoryEntry.name);
    if (directoryEntry.isDirectory()) return findDeclarationFiles(fullPath);
    return directoryEntry.name.endsWith("Capabilities.ts") ? [fullPath] : [];
  });
}

function isFeatureDeclaration(value: unknown): value is { declaration: { key: string } } {
  if (typeof value !== "object" || value === null || !("declaration" in value)) return false;
  const { declaration } = value as { declaration: unknown };
  return typeof declaration === "object" && declaration !== null && "key" in declaration;
}

type FoundDeclaration = { file: string; exportName: string; key: string };

async function loadDeclarations(): Promise<FoundDeclaration[]> {
  const found: FoundDeclaration[] = [];
  for (const file of findDeclarationFiles(APP_DIR)) {
    const moduleExports: Record<string, unknown> = await import(/* @vite-ignore */ file);
    for (const [exportName, value] of Object.entries(moduleExports)) {
      if (isFeatureDeclaration(value)) {
        found.push({ file: path.relative(APP_DIR, file), exportName, key: value.declaration.key });
      }
    }
  }
  return found;
}

describe("capabilityRegistry", () => {
  // Widened to string: with real entries the literal key types would reject a found key.
  const registeredKeys: string[] = registeredFeatures.map((feature) => feature.declaration.key);

  it("builds without a duplicate feature key or capability string", () => {
    expect(() => capabilityRegistry.allCapabilities).not.toThrow();
    expect(new Set(registeredKeys).size).toBe(registeredKeys.length);
  });

  it("lists every feature declaration exported from a *Capabilities.ts file", async () => {
    const found = await loadDeclarations();
    const missing = found.filter((declaration) => !registeredKeys.includes(declaration.key));
    expect(
      missing,
      `Not in capabilityRegistry.ts: ${missing.map((m) => `${m.exportName} (${m.file})`).join(", ")}`,
    ).toEqual([]);
  });

  it("registers no feature that has no declaration file under src/app", async () => {
    const foundKeys = new Set((await loadDeclarations()).map((declaration) => declaration.key));
    // Features owned by the permission module itself (declared under src/permission) go here.
    const permissionOwnedKeys: string[] = [];
    const orphans = registeredKeys.filter((key) => !foundKeys.has(key) && !permissionOwnedKeys.includes(key));
    expect(orphans).toEqual([]);
  });
});
