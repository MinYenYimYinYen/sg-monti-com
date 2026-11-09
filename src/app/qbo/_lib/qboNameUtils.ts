// Pure helpers for the names QuickBooks keeps unique. A DisplayName must be different across
// every customer, vendor and employee, so a name held by one blocks a new one on another.

export type QboUsedNameEntityType = "Vendor" | "Customer" | "Employee";

export type QboUsedName = {
  name: string;
  /** Trimmed, whitespace collapsed and lower cased: how QuickBooks decides two names are the same. */
  normalizedName: string;
  entityType: QboUsedNameEntityType;
  entityId: string;
  active: boolean;
};

type NamedRecord = {
  Id: string;
  DisplayName: string;
  Active: boolean;
};

/** Trims and collapses runs of whitespace, which also turns a pasted tab or line break into a space. */
export function normalizeQboName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function toUsedNames({
  records,
  entityType,
}: {
  records: NamedRecord[];
  entityType: QboUsedNameEntityType;
}): QboUsedName[] {
  return records.map((record) => ({
    name: record.DisplayName,
    normalizedName: normalizeQboName(record.DisplayName).toLowerCase(),
    entityType,
    entityId: record.Id,
    active: record.Active,
  }));
}

/** Each list is optional so a caller can check only the entities it has loaded. */
export function buildUsedNames({
  vendors = [],
  customers = [],
  employees = [],
}: {
  vendors?: NamedRecord[];
  customers?: NamedRecord[];
  employees?: NamedRecord[];
}): QboUsedName[] {
  return [
    ...toUsedNames({ records: vendors, entityType: "Vendor" }),
    ...toUsedNames({ records: customers, entityType: "Customer" }),
    ...toUsedNames({ records: employees, entityType: "Employee" }),
  ];
}

/**
 * The record holding this name, ignoring case and extra spaces. An active record wins if there is
 * more than one match. Compares in memory, so a name with an apostrophe never goes into a query.
 */
export function findUsedName({
  usedNames,
  name,
}: {
  usedNames: QboUsedName[];
  name: string;
}): QboUsedName | null {
  const wanted = normalizeQboName(name).toLowerCase();
  if (wanted.length === 0) return null;
  const matches = usedNames.filter((usedName) => usedName.normalizedName === wanted);
  return matches.find((usedName) => usedName.active) ?? matches[0] ?? null;
}

/** For messages: "a customer", "an employee". */
export function describeUsedNameEntity(usedName: QboUsedName): string {
  const entity = usedName.entityType.toLowerCase();
  const article = entity === "employee" ? "an" : "a";
  return `${article} ${usedName.active ? "" : "inactive "}${entity}`;
}
