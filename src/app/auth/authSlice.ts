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
import { PasswordResetRequest } from "@/app/auth/_types/PasswordResetRequest";

type RequestStatus = "idle" | "pending" | "success" | "error";

// 1. STATE
type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  invalidCredentialsEntered: boolean;
  passwordResetRequestStatus: RequestStatus;

  // Admin State
  admin: {
    pendingUsers: User[];
    pendingResets: PasswordResetRequest[];
  };

  // Transient state for the Registration Flow
  registrationEligibility: CheckedId;
  // Cache of checked IDs to prevent redundant API calls
  checkedIds: Record<string, CheckedId>;
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  invalidCredentialsEntered: false,
  passwordResetRequestStatus: "idle",
  admin: {
    pendingUsers: [],
    pendingResets: [],
  },
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
      // Silence the error because failing checkAuth is normal for unauthenticated users
      const error = handleError(e, { silent: true });
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/checkAuth" }),
);

// F. Request Password Reset
const requestPasswordReset = createAsyncThunk<
  AuthContract["requestPasswordReset"]["result"],
  WithConfig<AuthContract["requestPasswordReset"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/requestPasswordReset",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = {
        op: "requestPasswordReset",
        ...apiParams,
      };

      return await api<AuthContract["requestPasswordReset"]["result"]>(
        "/auth/api",
        { method: "POST", body },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/requestPasswordReset" }),
);

// G. Get Pending Actions (Admin)
const getPendingActions = createAsyncThunk<
  AuthContract["getPendingActions"]["result"],
  WithConfig<AuthContract["getPendingActions"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/getPendingActions",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = {
        op: "getPendingActions",
        ...apiParams,
      };

      return await api<AuthContract["getPendingActions"]["result"]>(
        "/auth/api",
        { method: "POST", body },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/getPendingActions" }),
);

// H. Approve User (Admin)
const approveUser = createAsyncThunk<
  AuthContract["approveUser"]["result"],
  WithConfig<AuthContract["approveUser"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/approveUser",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = { op: "approveUser", ...apiParams };

      return await api<AuthContract["approveUser"]["result"]>("/auth/api", {
        method: "POST",
        body,
      });
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/approveUser" }),
);

// I. Resolve Password Reset (Admin)
const resolvePasswordReset = createAsyncThunk<
  AuthContract["resolvePasswordReset"]["result"],
  WithConfig<AuthContract["resolvePasswordReset"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/resolvePasswordReset",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = {
        op: "resolvePasswordReset",
        ...apiParams,
      };

      return await api<AuthContract["resolvePasswordReset"]["result"]>(
        "/auth/api",
        { method: "POST", body },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/resolvePasswordReset" }),
);

// J. Change Password (User)
const changePassword = createAsyncThunk<
  AuthContract["changePassword"]["result"],
  WithConfig<AuthContract["changePassword"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/changePassword",
  async (params, { rejectWithValue }) => {
    try {
      const { showLoading, loadingMsg, force, staleTime, ...apiParams } =
        params;
      const body: OpMap<AuthContract> = {
        op: "changePassword",
        ...apiParams,
      };

      return await api<AuthContract["changePassword"]["result"]>(
        "/auth/api",
        { method: "POST", body },
      );
    } catch (e) {
      const error = handleError(e);
      return rejectWithValue(error.message);
    }
  },
  smartThunkOptions({ typePrefix: "auth/changePassword" }),
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
    setInvalidCredentials: (state, action: { payload: boolean }) => {
      state.invalidCredentialsEntered = action.payload;
    },
    resetPasswordResetStatus: (state) => {
      state.passwordResetRequestStatus = "idle";
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
    builder.addCase(login.pending, (state) => {
      state.invalidCredentialsEntered = false;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.user = action.payload.item;
      state.isAuthenticated = true;
      state.invalidCredentialsEntered = false;
    });
    builder.addCase(login.rejected, (state) => {
      state.invalidCredentialsEntered = true;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.admin.pendingUsers = [];
      state.admin.pendingResets = [];
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

    // Request Password Reset
    builder.addCase(requestPasswordReset.pending, (state) => {
      state.passwordResetRequestStatus = "pending";
    });
    builder.addCase(requestPasswordReset.fulfilled, (state) => {
      state.passwordResetRequestStatus = "success";
    });
    builder.addCase(requestPasswordReset.rejected, (state) => {
      state.passwordResetRequestStatus = "error";
    });

    // Get Pending Actions
    builder.addCase(getPendingActions.fulfilled, (state, action) => {
      state.admin.pendingUsers = action.payload.item.appliedUsers;
      state.admin.pendingResets = action.payload.item.pendingResets;
    });

    // Approve User
    builder.addCase(approveUser.fulfilled, (state, action) => {
      // Optimistic update: Remove the approved user from the list
      state.admin.pendingUsers = state.admin.pendingUsers.filter(
        (u) => u.userName !== action.meta.arg.userName,
      );
    });

    // Resolve Password Reset
    builder.addCase(resolvePasswordReset.fulfilled, (state, action) => {
      // Optimistic update: Remove the resolved request from the list
      state.admin.pendingResets = state.admin.pendingResets.filter(
        (r) => r.userName !== action.meta.arg.userName,
      );
    });

    // Change Password
    builder.addCase(changePassword.fulfilled, (state) => {
      if (state.user) {
        state.user.mustChangePassword = false;
      }
    });
  },
  selectors: {
    user: (state) => state.user,
    isAuthenticated: (state) => state.isAuthenticated,
    isInitialized: (state) => state.isInitialized,
    invalidCredentialsEntered: (state) => state.invalidCredentialsEntered,
    passwordResetRequestStatus: (state) => state.passwordResetRequestStatus,
    registrationEligibility: (state) => state.registrationEligibility,
    checkedIds: (state) => state.checkedIds,
    adminPendingUsers: (state) => state.admin.pendingUsers,
    adminPendingResets: (state) => state.admin.pendingResets,
  },
});

export const authActions = {
  ...authSlice.actions,
  checkEligibility,
  register,
  login,
  logout,
  checkAuth,
  requestPasswordReset,
  getPendingActions,
  approveUser,
  resolvePasswordReset,
  changePassword,
};
export const authSelect = { ...authSlice.selectors };
export default authSlice.reducer;
