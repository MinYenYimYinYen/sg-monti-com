import {CreatedUpdated} from "@/lib/mongoose/mongooseTypes";

export type PriceRangeRaw = {
  estimatedManHours: number | null;
  id: number;
  priceTableID: number;
  rate: number;
  size: number;
};

export type PriceRangeCore = {
  priceId: number;
  tableId: number;
  size: number;
  price: number;
}

export type PriceRangeDocProps = CreatedUpdated &{
  priceId: number;
}

export type PriceRangeDoc = PriceRangeDocProps & PriceRangeCore;

export type PriceRangeProps = {}

export type PriceRange = PriceRangeProps & PriceRangeCore;




