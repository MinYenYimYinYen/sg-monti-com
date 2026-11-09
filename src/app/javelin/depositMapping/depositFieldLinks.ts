import {
  isDefaultNameMissing,
  nameTypeForQboAccount,
  resolveLinkStatus,
} from "@/app/account/_lib/accountLinks";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";
import { DEPOSIT_FIELDS } from "@/app/javelin/_lib/depositFields";
import {
  DepositFieldLink,
  DepositFieldMappingDoc,
} from "@/app/javelin/depositMapping/DepositFieldMappingTypes";

/** One link per deposit field, in field order, with the same status rules as RealGreen account links. */
export function resolveDepositFieldLinks({
  mappingDocs,
  qboAccountMap,
  customerMap,
}: {
  mappingDocs: DepositFieldMappingDoc[];
  qboAccountMap: Map<string, QboAccount>;
  customerMap: Map<string, QboCustomerSummary>;
}): DepositFieldLink[] {
  const mappingByField = new Map(mappingDocs.map((doc) => [doc.field, doc]));
  // QBO accounts are loaded all at once, so an empty map means "not loaded yet".
  const qboLoaded = qboAccountMap.size > 0;

  return DEPOSIT_FIELDS.map((field) => {
    const mapping = mappingByField.get(field);
    const qboAccount = mapping ? (qboAccountMap.get(mapping.qboAccountId) ?? null) : null;
    const nameType = nameTypeForQboAccount(qboAccount);
    const defaultNameId = mapping?.defaultNameId ?? null;
    return {
      field,
      qboAccount,
      nameType,
      defaultNameId,
      status: resolveLinkStatus({
        qboAccount,
        hasMapping: mapping !== undefined,
        qboLoaded,
        isNameMissing: isDefaultNameMissing({ nameType, defaultNameId, customerMap }),
      }),
    };
  });
}
