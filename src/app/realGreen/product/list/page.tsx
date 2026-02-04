"use client";
import React from "react";
import {Container} from "@/components/Containers";
import {useProduct} from "@/app/realGreen/product/_lib/useProduct";
import {useSelector} from "react-redux";
import {productSelect} from "@/app/realGreen/product/_lib/productSelectors";

export default function ProductList() {
  useProduct({autoLoad: true})
  const products = useSelector(productSelect.products)
  return (
    <Container variant={"page"}>
      <div>ProductList</div>
    </Container>
  );
}