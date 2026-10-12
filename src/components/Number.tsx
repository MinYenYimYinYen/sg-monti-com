// import { Style } from "@react-pdf/types";

export type BaseNumberProps = {
  children: number | string | null | undefined;
  isMoney?: boolean;
  decimals?: number;
  locale?: string;
  useGrouping?: boolean;
  signDisplay?: "auto" | "never" | "always" | "exceptZero";
};

type NumberProps = BaseNumberProps & {
  className?: string;
};

export function formatNumber({
  children,
  isMoney = false,
  decimals = 0,
  locale = "en-US",
  useGrouping = true,
  signDisplay = "auto",
}: BaseNumberProps): string {
  const value = typeof children === "number" ? children : parseFloat(children ?? "");

  if (isNaN(value)) {
    throw new Error(`Number component received invalid value: ${children}`);
  }

  return new Intl.NumberFormat(locale, {
    style: isMoney ? "currency" : "decimal",
    currency: isMoney ? "USD" : undefined,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
    signDisplay,
  }).format(value);
}

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
  const formatted = formatNumber({ children, isMoney, decimals, locale, useGrouping, signDisplay });

  return (
    <data value={value} className={className}>
      {formatted}
    </data>
  );
}

