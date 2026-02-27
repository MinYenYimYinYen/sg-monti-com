import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UnitConfigContract } from "@/app/realGreen/product/unitConfig/api/UnitConfigContract";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { ProductUnitConfig } from "@/app/realGreen/product/_lib/types/ProductUnitConfigTypes";

interface UnitConfigState {
  configs: ProductUnitConfig[];
}

const initialState: UnitConfigState = {
  configs: [],
};

const unitConfigSlice = createSlice({
  name: "unitConfig",
  initialState,
  reducers: {
    updateConfig: (state, action: PayloadAction<ProductUnitConfig>) => {
      const config = action.payload;
      const existingIndex = state.configs.findIndex(
        (c) => c.productId === config.productId,
      );

      if (existingIndex >= 0) {
        state.configs[existingIndex] = config;
      } else {
        state.configs.push(config);
      }
    },
    removeConfig: (state, action: PayloadAction<number>) => {
      const productId = action.payload;
      state.configs = state.configs.filter((c) => c.productId !== productId);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getAllUnitConfigs.fulfilled, (state, action) => {
      state.configs = action.payload.configs;
    });
  },
});

const getAllUnitConfigs = createStandardThunk<UnitConfigContract, "getAll">({
  typePrefix: "unitConfig/getAllUnitConfigs",
  apiPath: "/realGreen/product/unitConfig/api",
  opName: "getAll",
});

const getUnitConfigByProductId = createStandardThunk<
  UnitConfigContract,
  "getByProductId"
>({
  typePrefix: "unitConfig/getUnitConfigByProductId",
  apiPath: "/realGreen/product/unitConfig/api",
  opName: "getByProductId",
});

const saveUnitConfig = createStandardThunk<UnitConfigContract, "saveConfig">({
  typePrefix: "unitConfig/saveUnitConfig",
  apiPath: "/realGreen/product/unitConfig/api",
  opName: "saveConfig",
});

const deleteUnitConfig = createStandardThunk<
  UnitConfigContract,
  "deleteConfig"
>({
  typePrefix: "unitConfig/deleteUnitConfig",
  apiPath: "/realGreen/product/unitConfig/api",
  opName: "deleteConfig",
});
export const unitConfigActions = {
  ...unitConfigSlice.actions,
  getAllUnitConfigs,
  getUnitConfigByProductId,
  saveUnitConfig,
  deleteUnitConfig,
};
export default unitConfigSlice.reducer;
