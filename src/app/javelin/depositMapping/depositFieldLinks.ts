import {
  isDefaultNameMissing,
  nameTypeForQboAccount,
  resolveLinkStatus,
} from "@/app/account/_lib/accountLinks";
import { QboAccount } from "@/app/qbo/account/types/QboAccountTypes";
import { QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";
import { DepositLinkKey } from "@/app/javelin/JavelinTypes";
import {
  DepositFieldLink,
  DepositFieldMappingDoc,
} from "@/app/javelin/depositMapping/DepositFieldMappingTypes";

/** One link per key, in the order given, with the same status rules as RealGreen account links. */
export function resolveDepositFieldLinks({
  keys,
  mappingDocs,
  qboAccountMap,
  customerMap,
}: {
  keys: DepositLinkKey[];
  mappingDocs: DepositFieldMappingDoc[];
  qboAccountMap: Map<string, QboAccount>;
  customerMap: Map<string, QboCustomerSummary>;
}): DepositFieldLink[] {
  const mappingByField = new Map(mappingDocs.map((doc) => [doc.field, doc]));
  // QBO accounts are loaded all at once, so an empty map means "not loaded yet".
  const qboLoaded = qboAccountMap.size > 0;

  return keys.map((field) => {
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
