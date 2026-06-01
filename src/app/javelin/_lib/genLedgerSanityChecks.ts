type SanityCheck = (date: string) => string | null;

export const genLedgerSanityChecks: SanityCheck[] = [
  (date) => {
    const year = new Date(date).getFullYear();
    return year !== new Date().getFullYear()
      ? `Date ${date} is not in the current year`
      : null;
  },
];
