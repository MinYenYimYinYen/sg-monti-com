import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

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
  id: number;
  description: string;
  maxRate: number;
  maxManHour: number;
  maxSize: number;
};

export type PriceTableDocProps = CreatedUpdated & {
  id: number;
};

export type PriceTableDoc = PriceTableCore & PriceTableDocProps;

export type PriceTableProps = {};

export type PriceTable = PriceTableDoc & PriceTableProps;
