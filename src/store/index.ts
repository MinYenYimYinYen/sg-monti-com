import {
  configureStore,
  Dispatch,
  PayloadAction,
  ThunkAction,
  ThunkDispatch,
} from "@reduxjs/toolkit";
import rootReducer from "./reducers";
// import debounceMiddleware from "@/store/middleware/debounce";

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false, // set to false for better performance
        serializableCheck: false, // set to false for better performance
      }), //.concat(debounceMiddleware),

    devTools: {
      actionSanitizer: (action) => {
        if (action.type.startsWith("auth/")) {
          return {
            ...action,
            payload: "Sanitized",
          };
        }
        return action;
      },
      stateSanitizer: (state) => {
        return {
          ...state,
          auth: "Sanitized",
          custBatchState: "Sanitized",
        };
      },
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<AppState, undefined, PayloadAction> &
  Dispatch;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  PayloadAction
>;
