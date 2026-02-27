"use client";

import React from "react";
import {
  UnitConversion,
  UnitContext,
  UNIT_CONTEXTS,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";
import { Button } from "@/style/components/button";
import { Pencil, Trash2, Plus } from "lucide-react";
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
  onAdd: () => void;
  onEdit: (conversion: UnitConversion) => void;
  onDelete: (context: UnitContext) => void;
  productName?: string;
}

export function ConversionList({
  conversions,
  onAdd,
  onEdit,
  onDelete,
  productName,
}: ConversionListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Conversions</CardTitle>
            {productName && (
              <p className="text-sm text-muted-foreground mt-1">{productName}</p>
            )}
          </div>
          <Button onClick={onAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Conversion
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {conversions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No conversions configured</p>
            <p className="text-xs mt-2">
              Click "Add Conversion" to define loading and purchasing units
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Context</TableHead>
                <TableHead>Unit Label</TableHead>
                <TableHead className="text-right">Conversion Factor</TableHead>
                <TableHead>Base Metric</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversions.map((conversion) => (
                <TableRow key={conversion.context}>
                  <TableCell className="font-medium">
                    {UNIT_CONTEXTS[conversion.context]}
                  </TableCell>
                  <TableCell>{conversion.unitLabel}</TableCell>
                  <TableCell className="text-right">
                    {conversion.conversionFactor}
                  </TableCell>
                  <TableCell className="capitalize">
                    {conversion.baseMetric}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(conversion)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        intensity="soft"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDelete(conversion.context)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
