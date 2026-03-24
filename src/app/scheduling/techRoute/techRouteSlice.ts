import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  baseLoadoutInventory,
  LoadoutBase,
  LoadoutInventory,
} from "@/app/realGreen/product/_lib/types/LoadoutTypes";
import { ProductSub, isProductSubCore } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { ProductSingle, isProductSingleCore } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductCore } from "@/app/realGreen/product/_lib/types/ProductTypes";

type PendingProductSlot = {
  id: string;
  masterId?: number;
  categoryFilter: string | null;
};

type TechRouteState = {
  tech: string | null;
  routeDate: string | null;
  startLoadout: LoadoutInventory;
  pendingProductSlots: PendingProductSlot[];
};

const initialState: TechRouteState = {
  tech: null,
  routeDate: null,
  startLoadout: baseLoadoutInventory,
  pendingProductSlots: [],
};
export const techRouteSlice = createSlice({
  name: "techRoute",
  initialState,
  reducers: {
    setTech: (state, action) => {
      state.tech = action.payload;
    },
    setRouteDate: (state, action) => {
      state.routeDate = action.payload;
    },
    updateStartLoadout: (state, action: PayloadAction<Partial<LoadoutBase>>) => {
      state.startLoadout = { ...state.startLoadout, ...action.payload };
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
      state.pendingProductSlots = state.pendingProductSlots.filter(s => s.id !== action.payload);
    },

    addProductToLoadout: (state, action: PayloadAction<{
      slotId: string;
      product: ProductSub | ProductSingle;
      amount: number;
    }>) => {
      const { slotId, product, amount } = action.payload;
      const slot = state.pendingProductSlots.find(s => s.id === slotId);

      if (!slot) return;

      // Determine if this is a sub or single
      if (isProductSubCore(product as ProductCore)) {
        const productSub = product as ProductSub;

        // If slot has masterId, check if this product is planned in that master
        if (slot.masterId !== undefined) {
          const master = state.startLoadout.masters.find(m => m.product.productId === slot.masterId);
          if (master) {
            // Check if this product is planned in master.subProducts
            const plannedSub = master.subProducts.find(s => s.product.productId === productSub.productId);

            if (plannedSub) {
              // Update startAmount for planned product
              plannedSub.startAmount = amount;
            } else {
              // Add as new subProduct to master
              master.subProducts.push({
                product: productSub,
                plannedAmount: 0,
                startAmount: amount,
                finishAmount: null,
                unit: productSub.unit,
              });
            }
          }
        } else {
          // Add to CustomProducts.subProducts
          state.startLoadout.subProducts.push({
            product: productSub,
            unit: productSub.unit,
            startAmount: amount,
            finishAmount: 0,
          });
        }
      } else if (isProductSingleCore(product as ProductCore)) {
        const productSingle = product as ProductSingle;

        // Singles always go to CustomProducts.singles
        state.startLoadout.singles.push({
          product: productSingle,
          unit: productSingle.unit,
          startAmount: amount,
          finishAmount: 0,
        });
      }

      // Remove the slot after adding product
      state.pendingProductSlots = state.pendingProductSlots.filter(s => s.id !== slotId);
    },

    removeProductFromLoadout: (state, action: PayloadAction<{
      masterId?: number;
      productId: number;
    }>) => {
      const { masterId, productId } = action.payload;

      if (masterId !== undefined) {
        // Remove from master.subProducts
        const master = state.startLoadout.masters.find(m => m.product.productId === masterId);
        if (master) {
          master.subProducts = master.subProducts.filter(s => s.product.productId !== productId);
        }
      } else {
        // Remove from CustomProducts
        state.startLoadout.singles = state.startLoadout.singles.filter(s => s.product.productId !== productId);
        state.startLoadout.subProducts = state.startLoadout.subProducts.filter(s => s.product.productId !== productId);
      }
    },

  },
});

export const techRouteActions = { ...techRouteSlice.actions };
export const techRouteReducer = techRouteSlice.reducer;
