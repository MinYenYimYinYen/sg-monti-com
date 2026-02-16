"use client";

import React, { useState } from "react";
import { ProductUsagePlanned } from "@/app/bizPlan/types/inventoryTypes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/style/components/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";

interface ProductsTableProps {
  products: ProductUsagePlanned[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const toggleExpand = (productId: number) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Total Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Services</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <React.Fragment key={product.productId}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(product.productId)}
                >
                  <TableCell className="font-medium">
                    {product.productCommon.description}
                  </TableCell>
                  <TableCell>{product.productCommon.productCode}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(product.totalQuantity)}
                  </TableCell>
                  <TableCell>{product.unitOfMeasure}</TableCell>
                  <TableCell className="text-right">
                    {product.enrichedAppProducts.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {expandedProductId === product.productId ? '▼' : '▶'}
                    </span>
                  </TableCell>
                </TableRow>

                {/* Expanded Details - Grouped by Service Code */}
                {expandedProductId === product.productId && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/20 p-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm mb-2">Breakdown by Service Code</h4>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1 px-2">Service Code</th>
                                <th className="text-right py-1 px-2">Services</th>
                                <th className="text-right py-1 px-2">Total Size (sqft)</th>
                                <th className="text-right py-1 px-2">Total Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Group by servCodeId
                                const byServCode = product.enrichedAppProducts.reduce((acc, enriched) => {
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
                                }, {} as Record<string, { servCode: any; services: number; totalSize: number; totalAmount: number }>);

                                return Object.entries(byServCode).map(([servCodeId, data]) => (
                                  <tr key={servCodeId} className="border-b">
                                    <td className="py-1 px-2">{data.servCode.longName}</td>
                                    <td className="text-right py-1 px-2">{data.services}</td>
                                    <td className="text-right py-1 px-2">
                                      {formatNumber(data.totalSize)}
                                    </td>
                                    <td className="text-right py-1 px-2">
                                      {formatNumber(data.totalAmount)}
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
