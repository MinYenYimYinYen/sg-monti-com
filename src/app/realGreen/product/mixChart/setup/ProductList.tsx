"use client";
import { MixChartProductRow } from "@/app/realGreen/product/mixChart/_lib/MixChartTypes";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { X } from "lucide-react";

type ProductListProps = {
  products: MixChartProductRow[];
  onRateChangeAction: (id: string, rate: number) => void;
  onRemoveAction: (id: string) => void;
};

export function ProductList({
  products,
  onRateChangeAction: onRateChange,
  onRemoveAction: onRemove,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No products added yet. Click &#34;Add Product&#34; to begin.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((row) => (
        <div
          key={row.id}
          className="flex items-center gap-3 p-2 rounded-md bg-card border border-border"
        >
          {/* Label */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{row.label}</p>
            <p className="text-xs text-muted-foreground">
              {row.unitConfigDisplay.getUnitLabel("app")}/1000
            </p>
          </div>

          {/* Rate input */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Input
              type="number"
              value={row.rate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) onRateChange(row.id, val);
              }}
              className="w-24 text-right"
              step="0.01"
              min={0}
            />
            <Label className="text-xs text-muted-foreground whitespace-nowrap">
              {row.unitConfigDisplay.getUnitLabel("app")}/1000
            </Label>
          </div>

          {/* Remove button */}
          <Button
            variant="outline"
            intensity="ghost"
            size="icon"
            onClick={() => onRemove(row.id)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
