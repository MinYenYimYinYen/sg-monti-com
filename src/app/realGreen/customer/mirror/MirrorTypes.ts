/**
 * @deprecated Use CustomerQueryTypes.ts instead.
 * This file re-exports all types under their old names for backward compatibility
 * during the rename migration. It will be deleted once all importers are updated.
 */
export type {
  CustomerEntityType as MirrorModel,
  JoinKey,
  StepRole,
  FilterOperator,
  FilterCondition,
  FilterGroup,
  FilterNode,
  FiltersInput,
  QueryStepSource as MirrorStepSource,
  CoreForEntity as CoreForModel,
  QueryStep as MirrorStep,
  CustomerQueryPlan as MirrorQueryPlan,
} from "@/app/realGreen/customer/mirror/CustomerQueryTypes";
