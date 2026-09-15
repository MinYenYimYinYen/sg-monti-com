export const round = (num: number, precision: number) => {
  const factor = 1 / precision;
  return Math.round(num * factor) / factor;
};

/** Rounds a dollar amount to the nearest nickel ($0.05), matching CRM price increase behavior. */
export const roundToNickel = (num: number): number => round(num, 0.05);
