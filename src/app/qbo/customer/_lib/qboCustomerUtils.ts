import { QboCustomer, QboCustomerSummary } from "@/app/qbo/customer/types/QboCustomerTypes";

// Pure helpers for customers, free of fetch and the database so they can be tested.

/** Keeps only what may reach the browser. Addresses, phones, emails, tax identifiers and balances stay behind. */
export function summarizeCustomer(customer: QboCustomer): QboCustomerSummary {
  return {
    Id: customer.Id,
    DisplayName: customer.DisplayName,
    FullyQualifiedName: customer.FullyQualifiedName ?? customer.DisplayName,
    Active: customer.Active ?? true,
    Job: customer.Job ?? false,
    CompanyName: customer.CompanyName ?? null,
  };
}

/** Case-insensitive, so "amy's" and "Amy's" sort together. Sorts by the full name so a job follows its parent. Returns a new list. */
export function sortCustomersByName(customers: QboCustomerSummary[]): QboCustomerSummary[] {
  return [...customers].sort((a, b) =>
    a.FullyQualifiedName.localeCompare(b.FullyQualifiedName, undefined, { sensitivity: "base" }),
  );
}

/** Callers that offer a choice use this. QuickBooks rejects an inactive customer on a transaction. */
export function pickActiveCustomers(customers: QboCustomerSummary[]): QboCustomerSummary[] {
  return customers.filter((customer) => customer.Active);
}
