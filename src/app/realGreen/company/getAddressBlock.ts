import {Company} from "@/app/realGreen/company/Company";

export function getCompanyAddressBlock(
  company: Company,
  // includeCompanyName: boolean,
  options?: { includeCompanyName?: boolean; singleLine?: boolean },
): string {
  const { includeCompanyName = false, singleLine = false } = options || {};
  const { CompanyName, AddressLine1, AddressLine2, AddressLine3 } = company;
  const elements = [];
  if (includeCompanyName) elements.push(CompanyName);
  elements.push(AddressLine1);
  elements.push(AddressLine2);
  elements.push(AddressLine3);

  const validElements = elements.filter((e) => {
    return e !== undefined && e !== null && e !== "";
  });

  const joiner = singleLine ? " " : "\n";

  return validElements.join(joiner);
}
