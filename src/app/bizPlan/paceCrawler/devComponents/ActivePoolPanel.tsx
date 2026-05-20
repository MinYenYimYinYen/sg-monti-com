"use client";

import { useSelector } from "react-redux";
import { paceCrawlerSelect } from "@/app/bizPlan/paceCrawler/paceCrawlerSelect";
import { progServSelect } from "@/app/realGreen/progServ/_lib/selectors/progServSelect";

export function ActivePoolPanel() {
  const activePoolMap = useSelector(paceCrawlerSelect.activePoolPriceByServCode);
  const progCodes = useSelector(progServSelect.progCodes);

  // Build rows with progCode context, filter to price > 0, sort descending.
  const rows = progCodes
    .flatMap((progCode) =>
      progCode.servCodes.map((sc) => ({
        servCodeId: sc.servCodeId,
        progCodeId: progCode.progCodeId,
        longName: sc.longName,
        price: activePoolMap.get(sc.servCodeId) ?? 0,
      })),
    )
    .filter((row) => row.price > 0)
    .sort((a, b) => b.price - a.price);

  const totalPrice = rows.reduce((sum, r) => sum + r.price, 0);

  return (
    <div className="p-3">
      <p className="text-[10px] text-muted-foreground mb-2">
        Unscheduled price pool per servCode — active + asap services only (excludes printed).
        This is the work the crawl will drain. ServCodes with $0 remaining are hidden.
      </p>
      <table className="text-xs border-separate border-spacing-0 w-full">
        <thead>
          <tr className="bg-accent/10">
            <th className="text-left px-2 py-1 border border-border font-semibold">ServCode</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">ProgCode</th>
            <th className="text-left px-2 py-1 border border-border font-semibold">Name</th>
            <th className="text-right px-2 py-1 border border-border font-semibold">$ Remaining</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.servCodeId} className="hover:bg-accent/5">
              <td className="px-2 py-1 border border-border font-mono">{row.servCodeId}</td>
              <td className="px-2 py-1 border border-border font-mono">{row.progCodeId}</td>
              <td className="px-2 py-1 border border-border text-muted-foreground truncate max-w-48">{row.longName}</td>
              <td className="px-2 py-1 border border-border text-right font-mono text-accent">
                ${Math.round(row.price).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-accent/5">
            <td colSpan={3} className="px-2 py-1 border border-border text-right text-muted-foreground font-semibold">
              Total
            </td>
            <td className="px-2 py-1 border border-border text-right font-mono font-semibold text-accent">
              ${Math.round(totalPrice).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
      <p className="text-[10px] text-muted-foreground mt-2">{rows.length} servCodes with remaining work</p>
    </div>
  );
}
