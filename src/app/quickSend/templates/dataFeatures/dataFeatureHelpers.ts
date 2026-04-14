import type { DataFeatureKey } from "./dataFeatures";
import type { ComponentType } from "react";
import { CustomerLookup } from "@/app/quickSend/templates/dataFeatures/custIdSearch/CustomerLookup";

/**
 * Maps data feature keys to their sender-view UI components.
 * Returns the component for features that require UI, or null for data-only features.
 *
 * Note: `progCode` is handled specially by `TemplateSender` — it renders `ProgramSelector`
 * directly with the correct props from `useSenderState` (selectedProgCodeId, onSelect).
 * It cannot be returned here because `ProgramSelector` requires those props.
 */
export function getSenderComponent(featureKey: DataFeatureKey): ComponentType | null {
  switch (featureKey) {
    case "custIdSearch":
      return CustomerLookup;
    case "season":
      return null; // No UI component - data comes from global settings
    case "progCode":
      return null; // Rendered specially by TemplateSender with props
    default:
      return null;
  }
}

/**
 * Analyzes enabled data features and returns flags for template builder.
 * Used by NodeEditor to determine which variable namespaces to enable in BlockContentEditor.
 */
export function getBuilderFlags(dataFeatures: DataFeatureKey[]): {
  customerVariablesEnabled: boolean;
  seasonVariableEnabled: boolean;
  progCodeVariablesEnabled: boolean;
} {
  return {
    customerVariablesEnabled: dataFeatures.includes("custIdSearch"),
    seasonVariableEnabled: dataFeatures.includes("season"),
    progCodeVariablesEnabled: dataFeatures.includes("progCode"),
  };
}

/**
 * Returns all data features that have associated UI components.
 */
export function getFeaturesWithUI(dataFeatures: DataFeatureKey[]): DataFeatureKey[] {
  return dataFeatures.filter((key) => getSenderComponent(key) !== null);
}
