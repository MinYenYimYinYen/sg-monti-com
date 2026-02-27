"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { ProductUsagePlanned } from "@/app/bizPlan/types/inventoryTypes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/style/components/card";
import {
  UnitContext,
  convertQuantity,
} from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";
import { useViewport } from "@/lib/hooks/useViewport";
import { cn } from "@/style/utils";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";

interface ProductsTableProps {
  products: ProductUsagePlanned[];
  unitContext: UnitContext;
}

export function ProductsTable({ products, unitContext }: ProductsTableProps) {
  const { isNarrow } = useViewport();
  const [expandedProductId, setExpandedProductId] = useState<number | null>(
    null,
  );

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const toggleExpand = (productId: number) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };

  // Helper to get converted quantity and unit label for a product
  const getDisplayQuantityAndUnit = (
    productCommon: ProductCommon,
    baseQuantity: number,
  ) => {
    const conversion = productCommon.unitConfig.conversions[unitContext];
    const convertedQty = convertQuantity(
      baseQuantity,
      "app",
      unitContext,
      productCommon.unitConfig,
    );

    return {
      quantity: convertedQty,
      unit: conversion.unitLabel,
    };
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No products found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products ({products.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table variant={"scroll"}>
          <TableHeader>
            <TableRow>
              {!isNarrow && (
                <TableHead className="sticky left-0 bg-background z-20">
                  Product
                </TableHead>
              )}
              <TableHead
                className={cn(isNarrow && "sticky left-0 bg-background z-20")}
              >
                Code
              </TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Services</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const { quantity, unit } = getDisplayQuantityAndUnit(
                product.productCommon,
                product.totalQuantity,
              );

              return (
                <React.Fragment key={product.productId}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(product.productId)}
                  >
                    {!isNarrow && (
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        {product.productCommon.description}
                      </TableCell>
                    )}
                    <TableCell
                      className={cn(
                        isNarrow && "sticky left-0 bg-background z-10",
                      )}
                    >
                      {product.productCommon.productCode}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(quantity)}
                    </TableCell>
                    <TableCell>{unit}</TableCell>
                    <TableCell className="text-right">
                      {product.enrichedAppProducts.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {expandedProductId === product.productId ? "▼" : "▶"}
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details - Grouped by Service Code */}
                  {expandedProductId === product.productId && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/20 p-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm mb-2">
                            Breakdown by Service Code
                          </h4>
                          <div className="max-h-64 overflow-y-auto">
                            <table className="text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-1 px-2">Code</th>
                                    <th className="text-right py-1 px-2">
                                      Count
                                    </th>
                                  <th className="text-right py-1 px-2">Size</th>
                                  <th className="text-right py-1 px-2">
                                    {unit}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  // Group by servCodeId
                                  const byServCode =
                                    product.enrichedAppProducts.reduce(
                                      (acc, enriched) => {
                                        const key = enriched.servCodeId;
                                        if (!acc[key]) {
                                          acc[key] = {
                                            servCode: enriched.servCode,
                                            services: 0,
                                            totalSize: 0,
                                            totalAmount: 0,
                                          };
                                        }
                                        acc[key].services += 1;
                                        acc[key].totalSize += enriched.size;
                                        acc[key].totalAmount += enriched.amount;
                                        return acc;
                                      },
                                      {} as Record<
                                        string,
                                        {
                                          servCode: any;
                                          services: number;
                                          totalSize: number;
                                          totalAmount: number;
                                        }
                                      >,
                                    );

                                  return Object.entries(byServCode).map(
                                    ([servCodeId, data]) => {
                                      const { quantity: convertedAmount } =
                                        getDisplayQuantityAndUnit(
                                          product.productCommon,
                                          data.totalAmount,
                                        );

                                      return (
                                        <tr
                                          key={servCodeId}
                                          className="border-b"
                                        >
                                          <td className="py-1 px-2">
                                            {data.servCode.servCodeId}
                                          </td>
                                            <td className="text-right py-1 px-2">
                                              {data.services}
                                            </td>
                                          <td className="text-right py-1 px-2">
                                            {formatNumber(data.totalSize)}
                                          </td>
                                          <td className="text-right py-1 px-2">
                                            {formatNumber(convertedAmount)}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
