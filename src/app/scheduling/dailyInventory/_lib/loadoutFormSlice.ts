import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  baseLoadout,
  LoadoutBase,
} from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { ProductSub, isProductSubCore } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle, isProductSingleCore } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductCore } from "@/app/realGreen/product/_lib/types/ProductTypes";

type PendingProductSlot = {
  id: string;
  masterId?: number;
  categoryFilter: string | null;
};

type LoadoutFormState = {
  tech: string | null;
  routeDate: string | null;
  loadout: LoadoutBase;
  loadoutTouchedFields: Set<string>;
  showAllLoadoutIssues: boolean;
  pendingProductSlots: PendingProductSlot[];
  pendingSlotProducts: Record<string, ProductSub | ProductSingle | null>;
  pendingSlotAmounts: Record<string, string>;
};

const initialState: LoadoutFormState = {
  tech: null,
  routeDate: null,
  loadout: baseLoadout,
  loadoutTouchedFields: new Set<string>(),
  showAllLoadoutIssues: false,
  pendingProductSlots: [],
  pendingSlotProducts: {},
  pendingSlotAmounts: {},
};
export const loadoutFormSlice = createSlice({
  name: "techRoute",
  initialState,
  reducers: {
    setTech: (state, action) => {
      state.tech = action.payload;
    },
    setRouteDate: (state, action) => {
      state.routeDate = action.payload;
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
      // Clear inputs when slot is removed
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

      // Determine if this is a sub or single
      if (isProductSubCore(product as ProductCore)) {
        const productSub = product as ProductSub;

        // If slot has masterId, check if this product is planned in that master
        if (slot.masterId !== undefined) {
          const master = state.loadout.masters.find(m => m.product.productId === slot.masterId);
          if (master) {
            // Check if this product is planned in master.subProducts
            const plannedSub = master.subProducts.find(s => s.product.productId === productSub.productId);

            if (plannedSub) {
              // Update startAmount for planned product
              plannedSub.startAmount = amount;
            } else {
              // Add as new subProduct to master
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
          // Add to CustomProducts.subProducts
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

        // Singles always go to CustomProducts.singles
        state.loadout.singles.push({
          productId: productSingle.productId,
          product: productSingle,
          unitId: productSingle.unitId,
          unit: productSingle.unit,
          startAmount: amount,
          finishAmount: 0,
        });
      }

      // Remove the slot after adding product and clear its inputs
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
        // Remove from master.subProducts
        const master = state.loadout.masters.find(m => m.product.productId === masterId);
        if (master) {
          master.subProducts = master.subProducts.filter(s => s.product.productId !== productId);
        }
      } else {
        // Remove from CustomProducts
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
      const field = action.payload;
      state.loadoutTouchedFields.add(field);
    },
    setShouldShowAllStartLoadoutIssues: (state, action: PayloadAction<boolean>) => {
      state.showAllLoadoutIssues = action.payload;
    }
  },
});

export const loadoutFormActions = { ...loadoutFormSlice.actions };
export const loadoutFormReducer = loadoutFormSlice.reducer;
