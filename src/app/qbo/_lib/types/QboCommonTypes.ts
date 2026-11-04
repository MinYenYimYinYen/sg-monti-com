// Shared pieces of Intuit's accounting API, reused by every QBO entity type. Names and
// shapes follow Intuit's definitions (PascalCase); see the "Types" decision in
// planning/qboPlan.md. Shapes here come from the sample JSON on the Account page, not from
// their own reference pages, so check them when a later entity needs more than this.

/** Intuit's ReferenceType, the `*Ref` shape. `value` is the referenced entity's Id. */
export type QboReference = {
  value: string;
  name?: string;
};

export type QboCurrencyRef = {
  value: string;
  name?: string;
};

export type QboModificationMetaData = {
  CreateTime?: string;
  LastUpdatedTime?: string;
};

export type QboFaultError = {
  Message: string;
  Detail?: string;
  code: string;
  element?: string;
};

/** The envelope of a successful `/query` call. An empty result has no key for the entity. */
export type QboQueryResponse = {
  QueryResponse: Record<string, unknown>;
  time?: string;
};
