/**
 * One-time migration: copies v1 StoredTemplate documents into the v2 StoredTemplate2
 * collection, rewriting mention IDs in the stored HTML.
 *
 * Safe to call multiple times — already-migrated templates are skipped.
 *
 * Usage: call `await migrateV1Templates()` at the top of the v2 `getTemplates` handler,
 * then remove the call once you've confirmed the migration ran cleanly.
 */

import { StoredTemplateModel } from "@/app/quickSend/storedTemplates/StoredTemplateModel";
import { StoredTemplate2Model } from "./StoredTemplateModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import type { StoredTemplateDoc as V1Doc } from "@/app/quickSend/storedTemplates/StoredTemplateTypes";
import type { StoredTemplateDoc as V2Doc } from "./StoredTemplateTypes";

// ─── HTML rewrite ─────────────────────────────────────────────────────────────

/**
 * Rewrites v1 mention `data-id` values in a section's HTML to v2 equivalents.
 *
 * Transformations applied:
 *   - `program.{alias}.{prop}` → `{progCodeId}.{prop}`  (using aliasMap)
 *   - `p.{prop}`               → `loop.{prop}`
 *   - `progChooser`            → span stripped entirely (was a control trigger)
 */
function rewriteMentionIds(
  html: string,
  aliasMap: Map<string, string>,
): string {
  // 1. Strip @progChooser trigger spans entirely
  let result = html.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="progChooser"[^>]*>[^<]*<\/span>/g,
    "",
  );

  // 2. Rewrite @p.{prop} → @loop.{prop}
  result = result.replace(
    /(<span[^>]*data-type="mention"[^>]*data-id=")p\.([^"]+)("[^>]*>[^<]*<\/span>)/g,
    (_, before, prop, after) => `${before}loop.${prop}${after}`,
  );

  // 3. Rewrite @program.{alias}.{prop} → @{progCodeId}.{prop}
  result = result.replace(
    /(<span[^>]*data-type="mention"[^>]*data-id=")program\.([^.]+)\.([^"]+)("[^>]*>[^<]*<\/span>)/g,
    (fullMatch, before, alias, prop, after) => {
      const progCodeId = aliasMap.get(alias);
      if (!progCodeId) {
        // Unknown alias — leave as-is so nothing is silently lost
        return fullMatch;
      }
      return `${before}${progCodeId}.${prop}${after}`;
    },
  );

  return result;
}

// ─── Main migration function ──────────────────────────────────────────────────

export async function migrateV1Templates(): Promise<void> {
  // Fetch all v1 templates
  const v1Docs = cleanMongoArray(
    await StoredTemplateModel.find().lean(),
  ) as V1Doc[];

  if (v1Docs.length === 0) {
    console.log("[migrateV1Templates] No v1 templates found — nothing to migrate.");
    return;
  }

  // Fetch existing v2 templateIds so we can skip already-migrated docs
  const existingV2Ids = new Set(
    (await StoredTemplate2Model.find({}, { templateId: 1 }).lean()).map(
      (d) => d.templateId as string,
    ),
  );

  let migrated = 0;
  let skipped = 0;

  for (const v1 of v1Docs) {
    // Derive the v2 templateId (same slug logic as the API route, with qs2__ prefix)
    const slug = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const v2TemplateId = `qs2__${slug(v1.saId)}__${slug(v1.name)}`;

    if (existingV2Ids.has(v2TemplateId)) {
      skipped++;
      continue;
    }

    // Build alias → progCodeId map from v1 programConfigs
    const aliasMap = new Map<string, string>();
    for (const config of v1.programConfigs) {
      // V1 ProgramConfig has `alias` and `progCodeId`
      const v1Config = config as { alias: string; progCodeId: string; includedServCodeIds: string[]; prepayId: string | null };
      if (!aliasMap.has(v1Config.alias)) {
        aliasMap.set(v1Config.alias, v1Config.progCodeId);
      }
    }

    // Rewrite HTML in each section
    const migratedSections = v1.sections.map((section) => ({
      sectionId: section.sectionId,
      templateHtml: rewriteMentionIds(section.templateHtml, aliasMap),
    }));

    // Deduplicate programConfigs by progCodeId (keep first occurrence per progCodeId)
    const seenProgCodeIds = new Set<string>();
    const migratedProgramConfigs: V2Doc["programConfigs"] = [];
    for (const config of v1.programConfigs) {
      const v1Config = config as { alias: string; progCodeId: string; includedServCodeIds: string[]; prepayId: string | null };
      if (!seenProgCodeIds.has(v1Config.progCodeId)) {
        seenProgCodeIds.add(v1Config.progCodeId);
        migratedProgramConfigs.push({
          progCodeId: v1Config.progCodeId,
          includedServCodeIds: v1Config.includedServCodeIds,
          priceOverride: null,
          prepayId: v1Config.prepayId,
        });
      }
    }

    const v2Doc: V2Doc = {
      templateId: v2TemplateId,
      name: v1.name,
      groupId: v1.groupId ?? null,
      saId: v1.saId,
      sections: migratedSections,
      programConfigs: migratedProgramConfigs,
      globalPrepayId: null,
    };

    await StoredTemplate2Model.create(v2Doc);
    migrated++;
  }

  console.log(
    `[migrateV1Templates] Done. Migrated: ${migrated}, Skipped (already exist): ${skipped}.`,
  );
}
