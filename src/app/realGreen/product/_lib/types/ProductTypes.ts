export type ProductRaw = {
  anyBranch: boolean;
  availableOnHandheld: boolean;
  canUpdateCost: boolean;
  commercialAccount: string;
  composition: string;
  cost: number | null;
  crewNotes: string;
  description: string;
  descriptionFrench: string;
  descriptionSpanish: string;
  epaNumber: string;
  id: number;
  isLabor: boolean;
  isMaster: boolean;
  isNonInventory: boolean;
  isProduction: boolean;
  isPurchaseOrderRequired: boolean;
  isWorkOrder: boolean;
  markup: number | null;
  onHand: number | null;
  onHold: number | null;
  productCategoryId: number;
  productCode: string;
  proposalNotes: string;
  reorderPoint: number | null;
  residentialAccount: string;
  size: string;
  target: string;
  unitCost: number | null;
  unitPrice: number | null;
  unitofMeasure: number;
};

// Remapped API data (not yet extended with MongoDB DocProps)
export type ProductCore = {
  productId: number;
  description: string;
  isLabor: boolean;
  isMaster: boolean;
  isNonInventory: boolean;
  isProduction: boolean;
  isMobile: boolean;
  isWorkOrder: boolean;
  categoryId: number;
  productCode: string; //identifier but not the key!
  unitId: number;
};

// What we store in MongoDB
export type ProductDocPropsStorage = {
  productId: number;
  productType: "single" | "master" | "sub";
  subProductIds?: number[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
};

// DocProps variants (discriminated union)
type ProductDocPropsBase = {
  productId: number;
  category: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductDocPropsMaster = ProductDocPropsBase & {
  productType: "master";
  subProductIds: number[];
};

export type ProductDocPropsSub = ProductDocPropsBase & {
  productType: "sub";
};

export type ProductDocPropsSingle = ProductDocPropsBase & {
  productType: "single";
};



// Extended documents (Core + DocProps)
export type ProductMasterDoc = ProductCore & ProductDocPropsMaster;
export type ProductSubDoc = ProductCore & ProductDocPropsSub;
export type ProductSingleDoc = ProductCore & ProductDocPropsSingle;



// Client-side hydrated types (for later implementation)
export type ProductProps = {};

export type ProductMaster = ProductMasterDoc & ProductProps;
export type ProductSub = ProductSubDoc & ProductProps;
export type ProductSingle = ProductSingleDoc & ProductProps;




