export type DataFeatureDef = {
  key: string;
  label: string;
  description: string;
  /**
   * Namespace for scalar @mention variables available in text/paragraph blocks.
   * Matches a key in the variable maps in `dataFeatureVariables.ts`
   * (e.g. "customer", "globalSettings", "progCode").
   */
  variableNamespace?: string;
  /**
   * Key into `TABLE_DATA_SOURCES` in `dataFeatureVariables.ts`.
   * Identifies which array property to iterate for table rows and which
   * flat properties of the row type are available as columns.
   * (e.g. "progCode.servCodes")
   */
  tableDataSource?: string;
};

export const DATA_FEATURE_DEFS = [
  {
    key: "custIdSearch",
    label: "Customer Lookup",
    description:
      "Adds a customer ID input to the send view. Enables @-mention variables.",
    variableNamespace: "customer",
  },
  {
    key: "season",
    label: "Season",
    description: "Enables @season variable.",
    variableNamespace: "globalSettings",
  },
  {
    key: "progCode",
    label: "Program",
    description: "Adds a program selector to the send view. Provides program service data for table blocks.",
    variableNamespace: "progCode",
    tableDataSource: "progCode.servCodes",
  },
] as const satisfies readonly DataFeatureDef[];

export type DataFeatureKey = (typeof DATA_FEATURE_DEFS)[number]["key"];
