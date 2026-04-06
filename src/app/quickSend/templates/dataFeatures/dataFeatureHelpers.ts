import type { DataFeatureKey } from "./dataFeatures";
import type { ComponentType } from "react";
import { CustomerLookup } from "@/app/quickSend/templates/dataFeatures/custIdSearch/CustomerLookup";

/**
 * Maps data feature keys to their sender-view UI components.
 * Returns the component for features that require UI, or null for data-only features.
 */
export function getSenderComponent(featureKey: DataFeatureKey): ComponentType | null {
  switch (featureKey) {
    case "custIdSearch":
      return CustomerLookup;
    case "season":
      return null; // No UI component - data comes from global settings
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
} {
  return {
    customerVariablesEnabled: dataFeatures.includes("custIdSearch"),
    seasonVariableEnabled: dataFeatures.includes("season"),
  };
}

/**
 * Returns all data features that have associated UI components.
 */
export function getFeaturesWithUI(dataFeatures: DataFeatureKey[]): DataFeatureKey[] {
  return dataFeatures.filter((key) => getSenderComponent(key) !== null);
}
