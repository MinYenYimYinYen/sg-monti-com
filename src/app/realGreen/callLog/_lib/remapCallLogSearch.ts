import {
  CallLogSearchCriteria,
  CallLogSearchRaw,
} from "@/app/realGreen/callLog/_lib/CallLogSearch";

function toRGStringRange(range: { min: string; max: string }) {
  return { minValue: range.min, maxValue: range.max };
}

export function remapCallLogSearch(
  criteria: CallLogSearchCriteria,
): CallLogSearchRaw {
  const raw: CallLogSearchRaw = {};

  if (criteria.custIds) raw.customerID = criteria.custIds;
  if (criteria.enterDate) raw.enterDate = toRGStringRange(criteria.enterDate);
  if (criteria.dueDate) raw.dueDate = toRGStringRange(criteria.dueDate);
  if (criteria.phone) raw.phone = criteria.phone;
  if (criteria.statuses) raw.status = criteria.statuses;
  if (criteria.enteredBy) raw.enteredBy = criteria.enteredBy;
  if (criteria.assignedTo) raw.assignedTo = criteria.assignedTo;
  if (criteria.created) raw.created = toRGStringRange(criteria.created);
  if (criteria.updated) raw.updated = toRGStringRange(criteria.updated);
  if (criteria.records !== undefined) raw.records = criteria.records;
  if (criteria.offset !== undefined) raw.offset = criteria.offset;

  return raw;
}
