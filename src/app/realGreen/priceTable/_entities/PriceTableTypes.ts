import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import {PriceRange} from "@/app/realGreen/priceTable/_entities/PriceRangeType";

export type PriceTableRaw = {
  available: boolean;
  description: string;
  descriptionFrench: string;
  descriptionSpanish: string;
  id: number;
  interpolate: boolean;
  maxManHour: number;
  maxRate: number;
  maxSize: number;
  ranges: Range[];
  roundAmount: string | null;
  roundCalculatedPrices: string | null;
};

export type PriceTableCore = {
  tableId: number;
  description: string;
  maxRate: number;
  maxSize: number;
  ranges: PriceRange[];
};

export type PriceTableDocProps = CreatedUpdated & {
  id: number;
  ranges: PriceRange[]
};

export type PriceTableDoc = PriceTableCore & PriceTableDocProps;

export type PriceTableProps = {};



export type PriceTable = PriceTableDoc & PriceTableProps;
