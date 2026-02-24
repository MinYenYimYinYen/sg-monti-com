type NumberProps = {
  children: number | string | null | undefined;
  isMoney?: boolean;
  decimals?: number;
  locale?: string;
  useGrouping?: boolean;
  signDisplay?: "auto" | "never" | "always" | "exceptZero";
  className?: string;
};

export function Number({
  children,
  isMoney = false,
  decimals = 0,
  locale = "en-US",
  useGrouping = true,
  signDisplay = "auto",
  className,
}: NumberProps) {
  const value = typeof children === "number" ? children : parseFloat(children ?? "");

  if (isNaN(value)) {
    throw new Error(`Number component received invalid value: ${children}`);
  }

  const formatted = new Intl.NumberFormat(locale, {
    style: isMoney ? "currency" : "decimal",
    currency: isMoney ? "USD" : undefined,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
    signDisplay,
  }).format(value);

  return (
    <data value={value} className={className}>
      {formatted}
    </data>
  );
}
