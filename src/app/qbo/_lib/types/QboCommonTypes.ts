// Shared pieces of Intuit's accounting API, reused by every QBO entity type. Names and
// shapes follow Intuit's definitions (PascalCase); see the "Types" decision in
// planning/qboPlan.md. Shapes here come from the sample JSON on the Account page, not from
// their own reference pages, so check them when a later entity needs more than this.

/** Intuit's ReferenceType, the `*Ref` shape. `value` is the referenced entity's Id. */
export type QboReference = {
  value: string;
  name?: string;
  /** Used on a Purchase's EntityRef to say what kind of entity is referenced, such as "Vendor". */
  type?: string;
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

/**
 * The envelope of a successful `/query` call. An empty result has no key for the entity.
 * Next to the entity array, QueryResponse also carries `startPosition` and `maxResults`.
 * Single-record entities (CompanyInfo, Preferences) are read with their own Read endpoint,
 * because their Query examples on Intuit's pages show a bare object instead of this envelope.
 */
export type QboQueryResponse = {
  QueryResponse: Record<string, unknown>;
  time?: string;
};

/** The `Fault` object inside a failed response. `type` is for example "ValidationFault". */
export type QboFault = {
  type?: string;
  Error?: QboFaultError[];
};

/** A failed call's body. Inside a batch, each item carries `Fault` without the `time`. */
export type QboFaultResponse = {
  Fault: QboFault;
  time?: string;
};

// Batch envelope (POST /batch), from Intuit's Batch page. Limits: 30 items per request, 40
// requests per minute per company, and at most 1000 objects in a response. Items are
// independent and their execution order must not be assumed, so an item cannot use something
// created by another item in the same batch.

export type QboBatchOperation = "create" | "update" | "delete";

/** An item that changes data. The entity travels under its own name, such as `Vendor: {...}`. */
export type QboBatchWriteItem<TEntityPart extends Record<string, unknown>> = {
  bId: string;
  operation: QboBatchOperation;
} & TEntityPart;

/** A read inside a batch. It has a Query string and no operation. */
export type QboBatchQueryItem = {
  bId: string;
  Query: string;
};

export type QboBatchRequest<TItem> = {
  BatchItemRequest: TItem[];
};

/**
 * Intuit's page omits the success body of a create or update item (its sample shows only faults
 * and a query result). Verified by the first live write: the created entity comes back under its
 * own name (a `Purchase` carrying its `Id`), next to the `bId`. Only creates are verified, not
 * updates or deletes.
 */
export type QboBatchItemResponse<TEntityPart extends Record<string, unknown>> = {
  bId: string;
  Fault?: QboFault;
  QueryResponse?: Record<string, unknown>;
} & Partial<TEntityPart>;

export type QboBatchResponse<TEntityPart extends Record<string, unknown>> = {
  BatchItemResponse: QboBatchItemResponse<TEntityPart>[];
  time?: string;
};
