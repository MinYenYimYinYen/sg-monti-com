"use client";

import React, { useState } from "react";
import {
  UnitConversion,
  UNIT_CONTEXTS,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";
import { SaveButton, SaveStatus } from "@/components/SaveButton";
import { Input } from "@/style/components/input";
import { Lock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";

interface ConversionListProps {
  conversions: UnitConversion[];
  onSave: (conversion: UnitConversion) => Promise<void>;
  productName?: string;
}

interface ConversionRowProps {
  conversion: UnitConversion;
  onSave: (conversion: UnitConversion) => Promise<void>;
}

function ConversionRow({ conversion, onSave }: ConversionRowProps) {
  const [unitLabel, setUnitLabel] = useState(conversion.unitLabel);
  const [conversionFactor, setConversionFactor] = useState(
    conversion.conversionFactor.toString(),
  );
  const [status, setStatus] = useState<SaveStatus>("idle");

  const isAppContext = conversion.context === "app";

  const hasChanges =
    unitLabel !== conversion.unitLabel ||
    parseFloat(conversionFactor) !== conversion.conversionFactor;

  const isValid =
    unitLabel.trim().length > 0 &&
    conversionFactor.length > 0 &&
    parseFloat(conversionFactor) > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setStatus("saving");
    try {
      await onSave({
        ...conversion,
        unitLabel: unitLabel.trim(),
        conversionFactor: parseFloat(conversionFactor),
      });
      setStatus("success");
    } catch (error) {
      console.error("Failed to save conversion", error);
      setStatus("idle");
    }
  };

  // Reset to current values when status returns to idle after success
  React.useEffect(() => {
    if (status === "idle") {
      setUnitLabel(conversion.unitLabel);
      setConversionFactor(conversion.conversionFactor.toString());
    }
  }, [conversion.unitLabel, conversion.conversionFactor, status]);

  return (
    <TableRow>
      <TableCell className="font-medium">
        {UNIT_CONTEXTS[conversion.context]}
      </TableCell>
      <TableCell>
        <Input
          value={unitLabel}
          onChange={(e) => setUnitLabel(e.target.value)}
          disabled={isAppContext}
          className="max-w-[200px]"
          placeholder="e.g., Bags, Pallets"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={conversionFactor}
          onChange={(e) => setConversionFactor(e.target.value)}
          disabled={isAppContext}
          className="max-w-[120px]"
        />
      </TableCell>
      <TableCell className="capitalize">{conversion.baseMetric}</TableCell>
      <TableCell className="text-right">
        {isAppContext ? (
          <div className="flex items-center justify-end gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-xs">Base unit</span>
          </div>
        ) : (
          <SaveButton
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || !isValid}
            status={status}
            onSuccessComplete={() => setStatus("idle")}
          >
            Save
          </SaveButton>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ConversionList({
  conversions,
  onSave,
  productName,
}: ConversionListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversions</CardTitle>
        {productName && (
          <p className="text-sm text-muted-foreground mt-1">{productName}</p>
        )}
      </CardHeader>
      <CardContent>
        {conversions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No conversions found</p>
            <p className="text-xs mt-2">
              All products should have default conversions
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Context</TableHead>
                <TableHead>Unit Label</TableHead>
                <TableHead>Conversion Factor</TableHead>
                <TableHead>Base Metric</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversions.map((conversion) => (
                <ConversionRow
                  key={conversion.context}
                  conversion={conversion}
                  onSave={onSave}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
