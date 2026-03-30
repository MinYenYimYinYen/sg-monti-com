import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LoadoutBase, baseLoadout } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductSub, isProductSubCore } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle, isProductSingleCore } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductCore } from "@/app/realGreen/product/_lib/types/ProductTypes";

export type PendingProductSlot = {
  id: string;
  masterId?: number;
  categoryFilter: string | null;
};

export type PackageSelection = {
  masterProductId: number;
  selectedPackageId: string;
};

type LoadoutStartState = {
  tech: string | null;
  routeDate: string | null;
  truckId: string | null;
  rideOnId: string | null;
  loadout: LoadoutBase;
  loadoutTouchedFields: Set<string>;
  showAllLoadoutIssues: boolean;
  pendingProductSlots: PendingProductSlot[];
  pendingSlotProducts: Record<string, ProductSub | ProductSingle | null>;
  pendingSlotAmounts: Record<string, string>;
  /** Worker's equipment package selection per master product. Not persisted between sessions. */
  packageSelections: PackageSelection[];
};

const initialState: LoadoutStartState = {
  tech: null,
  routeDate: null,
  truckId: null,
  rideOnId: null,
  loadout: baseLoadout,
  loadoutTouchedFields: new Set<string>(),
  showAllLoadoutIssues: false,
  pendingProductSlots: [],
  pendingSlotProducts: {},
  pendingSlotAmounts: {},
  packageSelections: [],
};

export const loadoutStartSlice = createSlice({
  name: "loadoutStart",
  initialState,
  reducers: {
    setTech: (state, action: PayloadAction<string>) => {
      state.tech = action.payload;
    },
    setRouteDate: (state, action: PayloadAction<string>) => {
      state.routeDate = action.payload;
    },
    setTruckId: (state, action: PayloadAction<string | null>) => {
      state.truckId = action.payload;
    },
    setRideOnId: (state, action: PayloadAction<string | null>) => {
      state.rideOnId = action.payload;
    },
    updateLoadout: (state, action: PayloadAction<Partial<LoadoutBase>>) => {
      state.loadout = { ...state.loadout, ...action.payload };
    },

    addPendingProductSlot: (state, action: PayloadAction<{ masterId?: number }>) => {
      const id = `slot-${Date.now()}-${Math.random()}`;
      state.pendingProductSlots.push({
        id,
        masterId: action.payload.masterId,
        categoryFilter: null,
      });
    },

    updatePendingSlotCategory: (state, action: PayloadAction<{ slotId: string; category: string | null }>) => {
      const slot = state.pendingProductSlots.find(s => s.id === action.payload.slotId);
      if (slot) {
        slot.categoryFilter = action.payload.category;
      }
    },

    removePendingProductSlot: (state, action: PayloadAction<string>) => {
      const slotId = action.payload;
      state.pendingProductSlots = state.pendingProductSlots.filter(s => s.id !== slotId);
      delete state.pendingSlotProducts[slotId];
      delete state.pendingSlotAmounts[slotId];
    },

    addProductToLoadout: (state, action: PayloadAction<{
      slotId: string;
      product: ProductSub | ProductSingle;
      amount: number | null;
    }>) => {
      const { slotId, product, amount } = action.payload;
      const slot = state.pendingProductSlots.find(s => s.id === slotId);

      if (!slot) return;

      if (isProductSubCore(product as ProductCore)) {
        const productSub = product as ProductSub;

        if (slot.masterId !== undefined) {
          const master = state.loadout.masters.find(m => m.product.productId === slot.masterId);
          if (master) {
            const plannedSub = master.subProducts.find(s => s.product.productId === productSub.productId);

            if (plannedSub) {
              plannedSub.startAmount = amount;
            } else {
              master.subProducts.push({
                productId: productSub.productId,
                product: productSub,
                plannedAmount: 0,
                startAmount: amount,
                finishAmount: null,
                unitId: productSub.unitId,
                unit: productSub.unit,
              });
            }
          }
        } else {
          state.loadout.subProducts.push({
            productId: productSub.productId,
            product: productSub,
            unitId: productSub.unitId,
            unit: productSub.unit,
            startAmount: amount,
            finishAmount: 0,
          });
        }
      } else if (isProductSingleCore(product as ProductCore)) {
        const productSingle = product as ProductSingle;

        state.loadout.singles.push({
          productId: productSingle.productId,
          product: productSingle,
          unitId: productSingle.unitId,
          unit: productSingle.unit,
          startAmount: amount,
          finishAmount: 0,
        });
      }

      state.pendingProductSlots = state.pendingProductSlots.filter(s => s.id !== slotId);
      delete state.pendingSlotProducts[slotId];
      delete state.pendingSlotAmounts[slotId];
    },

    removeProductFromLoadout: (state, action: PayloadAction<{
      masterId?: number;
      productId: number;
    }>) => {
      const { masterId, productId } = action.payload;

      if (masterId !== undefined) {
        const master = state.loadout.masters.find(m => m.product.productId === masterId);
        if (master) {
          master.subProducts = master.subProducts.filter(s => s.product.productId !== productId);
        }
      } else {
        state.loadout.singles = state.loadout.singles.filter(s => s.product.productId !== productId);
        state.loadout.subProducts = state.loadout.subProducts.filter(s => s.product.productId !== productId);
      }
    },

    updatePendingSlotProduct: (state, action: PayloadAction<{
      slotId: string;
      product: ProductSub | ProductSingle | null;
    }>) => {
      const { slotId, product } = action.payload;
      state.pendingSlotProducts[slotId] = product;
    },

    updatePendingSlotAmount: (state, action: PayloadAction<{
      slotId: string;
      amount: string;
    }>) => {
      const { slotId, amount } = action.payload;
      state.pendingSlotAmounts[slotId] = amount;
    },

    clearPendingSlotInputs: (state, action: PayloadAction<string>) => {
      const slotId = action.payload;
      delete state.pendingSlotProducts[slotId];
      delete state.pendingSlotAmounts[slotId];
    },

    markStartLoadoutFieldTouched: (state, action: PayloadAction<string>) => {
      state.loadoutTouchedFields.add(action.payload);
    },

    setShouldShowAllStartLoadoutIssues: (state, action: PayloadAction<boolean>) => {
      state.showAllLoadoutIssues = action.payload;
    },

    setPackageSelection: (
      state,
      action: PayloadAction<{ masterProductId: number; selectedPackageId: string }>,
    ) => {
      const { masterProductId, selectedPackageId } = action.payload;
      const existing = state.packageSelections.find(
        (s) => s.masterProductId === masterProductId,
      );
      if (existing) {
        existing.selectedPackageId = selectedPackageId;
      } else {
        state.packageSelections.push({ masterProductId, selectedPackageId });
      }
    },

    clearPackageSelections: (state) => {
      state.packageSelections = [];
    },

    clearStartForm: (state) => {
      state.tech = null;
      state.routeDate = null;
      state.truckId = null;
      state.rideOnId = null;
      state.loadout = baseLoadout;
      state.loadoutTouchedFields = new Set<string>();
      state.showAllLoadoutIssues = false;
      state.packageSelections = [];
      state.pendingProductSlots = [];
      state.pendingSlotProducts = {};
      state.pendingSlotAmounts = {};
    },
  },
});

export const loadoutStartActions = { ...loadoutStartSlice.actions };
export const loadoutStartReducer = loadoutStartSlice.reducer;
