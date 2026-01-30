import { Company } from "@/app/realGreen/company/_lib/CompanyTypes";
import { AppError } from "@/lib/errors/AppError";

function chooseDefault(companies: Company[]) {
  if (!companies || companies.length === 0) {
    return null;
  }
  const defaultCompany = companies.find((company) => company.isDefaultCompany);
  if (defaultCompany) {
    return defaultCompany;
  } else {
    return companies[0];
  }
}

export function getAddressBlock(
  company: Company,
  // includeCompanyName: boolean,
  options?: { includeCompanyName?: boolean; singleLine?: boolean },
): string {
  const { includeCompanyName = false, singleLine = false } = options || {};
  const { companyName, addressLine1, addressLine2, addressLine3 } = company;
  const elements = [];
  if (includeCompanyName) elements.push(companyName);
  elements.push(addressLine1);
  elements.push(addressLine2);
  elements.push(addressLine3);

  const validElements = elements.filter((e) => {
    return e !== undefined && e !== null && e !== "";
  });

  const joiner = singleLine ? " " : "\n";

  return validElements.join(joiner);
}

export const companyFunc = { chooseDefault, getAddressBlock };
