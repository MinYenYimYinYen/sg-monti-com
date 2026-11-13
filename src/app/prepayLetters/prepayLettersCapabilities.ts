import { createFeatureCapabilities } from "@/permission/PermissionTypes";
import { formTemplateCapabilities } from "@/app/formTemplate/formTemplateCapabilities";
import { globalSettingsCapabilities } from "@/app/globalSettings/globalSettingsCapabilities";

// The prepay letter module's own stored data: named letter configs (season, discounts, messages)
// and named upsell priority lists. Both are shared by every user and owned by the person who saved
// them. The renewals tab has no stored data of its own, it only reads these two and the form
// templates.
//
// prepayConfigs.read     -> config getConfigs
// prepayConfigs.write    -> config saveConfig
// prepayConfigs.delete   -> config deleteConfig
// upsellPriorities.read  -> upsellPriorities getUpsellPriorities
// upsellPriorities.write -> upsellPriorities saveUpsellPriorities
// upsellPriorities.delete -> upsellPriorities deleteUpsellPriorities
//
// Ownership is a separate rule from access, as in formTemplate: the routes derive the id and saId
// from the caller, so `write` only ever saves the holder's own copy, and delete refuses a record
// the caller does not own. The one override is the superuser, who may delete any config (it was
// the admin role before).
//
// requires: `prepayConfigs.read` is the entry capability for the whole module (nav entry and
// layout). The layout also loads the upsell lists, the form templates and the global settings
// (renewal flags), and the renewals tab reads all of them. The RealGreen data it uses (programs,
// price tables, tax codes, discounts, flags, company, customers) is not declared yet (deferred).
export const prepayLettersCapabilities = createFeatureCapabilities({
  key: "prepayLetters",
  resources: {
    prepayConfigs: { shape: "collection", verbs: ["read", "write", "delete"] },
    upsellPriorities: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
  requires: {
    "prepayConfigs.read": [
      "prepayLetters.upsellPriorities.read",
      formTemplateCapabilities.can.formTemplates.read,
      globalSettingsCapabilities.can.settings.read,
    ],
  },
});
