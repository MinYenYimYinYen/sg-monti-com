import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// RealGreen's prepay codes (the percent off a customer gets for paying ahead), read live from
// RealGreen and joined with the stored prepay properties kept here. Not the prepay letters
// feature (`prepayLetters`), which only uses these codes.
//
// prepays.realGreen.read -> realGreen/prepay getAll
//
// Read only: the contract has no write, and this app never changes RealGreen's prepay codes.
// There is no screen of its own. The quick send page loads the codes to price a letter with its
// prepay percent.
export const prepayCapabilities = createFeatureCapabilities({
  key: "prepay",
  resources: {
    prepays: { shape: "collection", source: "realGreen", verbs: ["read"] },
  },
});
