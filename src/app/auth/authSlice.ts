import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { User } from "@/app/auth/_types/User";
import { AuthContract } from "@/app/auth/_types/AuthContract";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { AppState } from "@/store";
import { api } from "@/lib/api/api";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { handleError } from "@/lib/errors/errorHandler";
import { smartThunkOptions } from "@/store/reduxUtil/smartThunkOptions";
import { CheckedId } from "@/app/auth/_types/authTypes";

// 1. STATE
type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Transient state for the Registration Flow
  registrationEligibility: CheckedId;
  // Cache of checked IDs to prevent redundant API calls
  checkedIds: Record<string, CheckedId>;
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  registrationEligibility: null,
  checkedIds: {},
};

// 2. THUNKS

// A. Check Eligibility
const checkEligibility = createAsyncThunk<
  AuthContract["checkEligibility"]["result"],
  WithConfig<AuthContract["checkEligibility"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/checkEligibility",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = {
        op: "checkEligibility",
        ...apiParams,
      };

      return await api<AuthContract["checkEligibility"]["result"]>(
        "/auth/api",
        { method: "POST", body },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({
    typePrefix: "auth/checkEligibility",
    customCondition: (arg, { getState }) => {
      const state = getState() as AppState;
      // If we already have a result for this ID, skip the network call
      // The component can just read from `checkedIds`
      return !state.auth.checkedIds[arg.saId];
    },
  }),
);

// B. Register
const register = createAsyncThunk<
  AuthContract["register"]["result"],
  WithConfig<AuthContract["register"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/register",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = { op: "register", ...apiParams };

      return await api<AuthContract["register"]["result"]>("/auth/api", {
        method: "POST",
        body,
      });
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/register" }),
);

// C. Login
const login = createAsyncThunk<
  AuthContract["login"]["result"],
  WithConfig<AuthContract["login"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/login",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = { op: "login", ...apiParams };

      return await api<AuthContract["login"]["result"]>("/auth/api", {
        method: "POST",
        body,
      });
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/login" }),
);

// D. Logout
const logout = createAsyncThunk<
  AuthContract["logout"]["result"],
  WithConfig<AuthContract["logout"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/logout",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = { op: "logout", ...apiParams };

      return await api<AuthContract["logout"]["result"]>("/auth/api", {
        method: "POST",
        body,
      });
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/logout" }),
);

// E. Check Auth (Session Restoration)
const checkAuth = createAsyncThunk<
  AuthContract["checkAuth"]["result"],
  WithConfig<AuthContract["checkAuth"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/checkAuth",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = { op: "checkAuth", ...apiParams };

      return await api<AuthContract["checkAuth"]["result"]>("/auth/api", {
        method: "POST",
        body,
      });
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/checkAuth" }),
);

// 3. SLICE
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Manual reset if needed (e.g., user cancels registration)
    resetEligibility: (state) => {
      state.registrationEligibility = null;
    },
    // If we need to manually set eligibility from the cache
    restoreEligibilityFromCache: (state, action: { payload: string }) => {
      const saId = action.payload;
      if (state.checkedIds[saId]) {
        state.registrationEligibility = state.checkedIds[saId];
      }
    },
  },
  extraReducers: (builder) => {
    // Check Eligibility
    builder.addCase(checkEligibility.fulfilled, (state, action) => {
      const result: CheckedId = {
        checked: true,
        isValid: action.payload.isValid,
        alreadyExists: action.payload.alreadyExists,
        idChecked: action.meta.arg.saId,
      };

      state.registrationEligibility = result;
      // Cache the result
      state.checkedIds[action.meta.arg.saId] = result;
    });

    // Register
    builder.addCase(register.fulfilled, (state, action) => {
      state.user = action.payload.item;
      state.isAuthenticated = true;
      state.registrationEligibility = null; // Cleanup
    });

    // Login
    builder.addCase(login.fulfilled, (state, action) => {
      state.user = action.payload.item;
      state.isAuthenticated = true;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });

    // Check Auth
    builder.addCase(checkAuth.pending, (state) => {
      state.isInitialized = false;
    });
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      state.user = action.payload.item;
      state.isAuthenticated = true;
      state.isInitialized = true;
    });
    builder.addCase(checkAuth.rejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    });
  },
  selectors: {
    user: (state) => state.user,
    isAuthenticated: (state) => state.isAuthenticated,
    isInitialized: (state) => state.isInitialized,
    registrationEligibility: (state) => state.registrationEligibility,
    checkedIds: (state) => state.checkedIds,
  },
});

export const authActions = {
  ...authSlice.actions,
  checkEligibility,
  register,
  login,
  logout,
  checkAuth,
};
export const authSelect = { ...authSlice.selectors };
export default authSlice.reducer;
