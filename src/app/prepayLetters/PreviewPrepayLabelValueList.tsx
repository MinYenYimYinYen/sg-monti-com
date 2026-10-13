import { formatNumber } from "@/components/Number";
import type { LabelValuePair } from "@/lib/pdf/_components/LabelValueList";

type PreviewPrepayLabelValueListProps = {
  pairs: LabelValuePair[];
  scale: number;
};

/**
 * DOM preview equivalent of `PrepayLabelValueList` for the template editor handles mode.
 * Renders three columns: label (flex-1), annotation (fixed width, centered), value (right-aligned).
 * The annotation column is only shown when at least one pair has an annotation.
 */
export function PreviewPrepayLabelValueList({ pairs, scale }: PreviewPrepayLabelValueListProps) {
  const hasAnnotations = pairs.some((p) => p.annotation != null);
  const fontSize = 10 * scale;

  return (
    <div className="w-full flex flex-col" style={{ fontSize, lineHeight: 1.3 }}>
      {pairs.map((pair, i) => {
        let displayValue = "";
        if (pair.value != null) {
          if (pair.isMoney || typeof pair.value === "number") {
            try {
              displayValue = formatNumber({
                children: pair.value,
                isMoney: pair.isMoney,
                decimals: pair.decimals ?? 0,
              });
            } catch {
              displayValue = String(pair.value);
            }
          } else {
            displayValue = String(pair.value);
          }
        }

        return (
          <div key={i} className="flex w-full">
            {/* Label — takes all remaining space */}
            <span className="flex-1 text-foreground truncate">{pair.label}</span>

            {/* Annotation column — only shown when any pair has an annotation */}
            {hasAnnotations && (
              <span
                className="text-muted-foreground text-center shrink-0"
                style={{ width: 48 * scale }}
              >
                {pair.annotation ?? ""}
              </span>
            )}

            {/* Value — right-aligned */}
            <span className="text-foreground ml-1 shrink-0">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
}
