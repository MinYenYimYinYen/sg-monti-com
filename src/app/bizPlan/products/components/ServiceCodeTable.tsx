"use client";

import React, { useState } from "react";
import { ProductsByServCode } from "@/app/bizPlan/types/inventoryTypes";
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
import { useViewport } from "@/lib/hooks/useViewport";

interface ServiceCodeTableProps {
  servCodes: ProductsByServCode[];
}

export function ServiceCodeTable({ servCodes }: ServiceCodeTableProps) {
  const { isNarrow } = useViewport();
  const [expandedServCodeId, setExpandedServCodeId] = useState<string | null>(
    null,
  );

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const toggleExpand = (servCodeId: string) => {
    setExpandedServCodeId(
      expandedServCodeId === servCodeId ? null : servCodeId,
    );
  };

  if (servCodes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No service codes found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Codes ({servCodes.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table variant={"scroll"}>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Area</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servCodes.map((servCodeData) => (
                <React.Fragment key={servCodeData.servCodeId}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(servCodeData.servCodeId)}
                  >
                    <TableCell className="font-medium">
                      {servCodeData.servCode.servCodeId}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(servCodeData.totalServices)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(servCodeData.totalArea)}
                    </TableCell>
                    <TableCell className="text-right">
                      {servCodeData.products.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-muted-foreground">
                        {expandedServCodeId === servCodeData.servCodeId
                          ? "▼"
                          : "▶"}
                      </span>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details - Products for this Service Code */}
                  {expandedServCodeId === servCodeData.servCodeId && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/20 p-4">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm mb-2">
                            Products Needed
                          </h4>
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  {!isNarrow && (
                                    <th className="text-left py-1 px-2">
                                      Product
                                    </th>
                                  )}
                                  <th className="text-left py-1 px-2">Code</th>
                                  <th className="text-right py-1 px-2">
                                    Quantity
                                  </th>
                                  <th className="text-left py-1 px-2">Unit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {servCodeData.products.map((product) => (
                                  <tr
                                    key={product.productId}
                                    className="border-b"
                                  >
                                    {!isNarrow && (
                                      <td className="py-1 px-2">
                                        {product.productCommon.description}
                                      </td>
                                    )}
                                    <td className="py-1 px-2">
                                      {product.productCommon.productCode}
                                    </td>
                                    <td className="text-right py-1 px-2">
                                      {formatNumber(product.totalQuantity)}
                                    </td>
                                    <td className="py-1 px-2">
                                      {product.unitOfMeasure}
                                    </td>
                                  </tr>
                                ))}
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
        </div>
      </CardContent>
    </Card>
  );
}
