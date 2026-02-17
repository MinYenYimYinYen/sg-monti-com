"use client";

import React, { useState } from "react";
import { ProductCommonDoc } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { Input } from "@/style/components/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/style/components/card";
import { ScrollArea } from "@/style/components/scroll-area";
import { Search } from "lucide-react";

interface ProductSelectorProps {
  products: ProductCommonDoc[];
  selectedProductId: number | null;
  onSelectProduct: (productId: number) => void;
}

export function ProductSelector({
  products,
  selectedProductId,
  onSelectProduct,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.productCode.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
    );
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Select Product</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="space-y-1 p-4">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No products found
              </p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.productId}
                  onClick={() => onSelectProduct(product.productId)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedProductId === product.productId
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  <div className="font-medium text-sm">{product.productCode}</div>
                  <div className="text-xs opacity-90 mt-1 line-clamp-2">
                    {product.description}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
