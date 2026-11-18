import { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";
import { baseTaxCode } from "@/app/realGreen/taxCode/_lib/baseTaxCode";
import { bySlot, TaxSlotTuple } from "@/app/realGreen/taxCode/taxSlot";
import {
  ServiceTaxLine,
  ServiceTaxLineCore,
} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

/**
 * Resolves a customer's tax slot ids to tax codes, keeping each code in its slot.
 *
 * An id with no matching code (typically because `useTaxCode` was not called, so the codes are not
 * loaded) becomes `baseTaxCode` instead of throwing. It shows up as an obviously bogus code, which
 * is the signal to add the hook.
 */
export function hydrateTaxSlotCodes({
  taxSlotIds,
  taxCodeMap,
}: {
  taxSlotIds: TaxSlotTuple<string | null>;
  taxCodeMap: Map<string, TaxCode>;
}): TaxSlotTuple<TaxCode | null> {
  const [first, second, third] = taxSlotIds.map((taxId) =>
    taxId === null ? null : (taxCodeMap.get(taxId) ?? baseTaxCode),
  );
  return [first, second, third];
}

/**
 * The customer's tax codes in slot order, without the empty slots. Pricing rounds tax per code and
 * does not care which slot a code sits in, so it reads this list; only recorded history needs slots.
 */
export function deriveTaxCodes(taxSlotCodes: TaxSlotTuple<TaxCode | null>): TaxCode[] {
  return taxSlotCodes.filter((taxCode): taxCode is TaxCode => taxCode !== null);
}

/**
 * Attaches to each tax line the code in the same slot on the customer. A line in a slot where the
 * customer has no code gets `baseTaxCode`, so the mismatch is visible in the data instead of lost.
 */
export function hydrateTaxLines({
  taxLineCores,
  taxSlotCodes,
}: {
  taxLineCores: ServiceTaxLineCore[];
  taxSlotCodes: TaxSlotTuple<TaxCode | null>;
}): ServiceTaxLine[] {
  return taxLineCores.map((line) => ({
    ...line,
    taxCode: bySlot({ values: taxSlotCodes, slot: line.slot }) ?? baseTaxCode,
  }));
}
