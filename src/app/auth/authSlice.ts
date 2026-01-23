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
import { DataResponse } from "@/lib/api/types/responses";

type RequestStatus = "idle" | "pending" | "success" | "error";

export type PendingAdminActions = {
  appliedUsers: User[];
  pendingResets: PasswordResetRequest[];
};

// 1. STATE
type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  invalidCredentialsEntered: boolean;
  passwordResetRequestStatus: RequestStatus;

  // Admin State
  pendingAdminActions: PendingAdminActions;

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
  pendingAdminActions: {
    appliedUsers: [],
    pendingResets: [],
  },
  registrationEligibility: null,
  checkedIds: {},
};

// 2. THUNKS

// A. Check Eligibility
const checkEligibility = createAsyncThunk<
  CheckedId,
  WithConfig<AuthContract["checkEligibility"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/checkEligibility",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = {
      op: "checkEligibility",
      ...params,
    };

    const res = await api<DataResponse<CheckedId>>("/auth/api", {
      method: "POST",
      body,
    });

    if (!res.success) return rejectWithValue(res.message);

    return res.payload;
  },
  smartThunkOptions({
    typePrefix: "auth/checkEligibility",
    customCondition: (arg, { getState }) => {
      const state = getState() as AppState;
      return !state.auth.checkedIds[arg.params.saId];
    },
  }),
);

// B. Register
const register = createAsyncThunk<
  User,
  WithConfig<AuthContract["register"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/register",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = { op: "register", ...params };

    const res = await api<DataResponse<User>>("/auth/api", {
      method: "POST",
      body,
    });

    if (!res.success) return rejectWithValue(res.message);
    return res.payload;
  },
  smartThunkOptions({ typePrefix: "auth/register" }),
);

// C. Login
const login = createAsyncThunk<
  User,
  WithConfig<AuthContract["login"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/login",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = { op: "login", ...params };

    const res = await api<AuthContract["login"]["result"]>("/auth/api", {
      method: "POST",
      body,
    });

    if (!res.success) return rejectWithValue(res.message);
    return res.payload;
  },
  smartThunkOptions({ typePrefix: "auth/login" }),
);

// D. Logout
const logout = createAsyncThunk<
  boolean,
  WithConfig<AuthContract["logout"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/logout",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = { op: "logout", ...params };

    const res = await api<AuthContract["logout"]["result"]>("/auth/api", {
      method: "POST",
      body,
    });

    if (!res.success) return rejectWithValue(res.message);
    return res.success;
  },
  smartThunkOptions({ typePrefix: "auth/logout" }),
);

// E. Check Auth (Session Restoration)
const checkAuth = createAsyncThunk<
  User,
  WithConfig<AuthContract["checkAuth"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/checkAuth",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = { op: "checkAuth", ...params };

    const res = await api<AuthContract["checkAuth"]["result"]>("/auth/api", {
      method: "POST",
      body,
    });

    if (!res.success) {
      handleError(
        { message: res.message, type: "AUTH_ERROR", isOperational: true },
        { silent: true },
      );
      return rejectWithValue(res.message);
    }
    return res.payload;
  },
  smartThunkOptions({ typePrefix: "auth/checkAuth" }),
);

// F. Request Password Reset
const requestPasswordReset = createAsyncThunk<
  boolean,
  WithConfig<AuthContract["requestPasswordReset"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/requestPasswordReset",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = {
      op: "requestPasswordReset",
      ...params,
    };

    const res = await api<AuthContract["requestPasswordReset"]["result"]>(
      "/auth/api",
      { method: "POST", body },
    );

    if (!res.success) return rejectWithValue(res.message);
    return res.success;
  },
  smartThunkOptions({ typePrefix: "auth/requestPasswordReset" }),
);

// G. Get Pending Actions (Admin)
const getPendingActions = createAsyncThunk<
  { appliedUsers: User[]; pendingResets: PasswordResetRequest[] },
  WithConfig<AuthContract["getPendingActions"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/getPendingActions",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = {
      op: "getPendingActions",
      ...params,
    };

    const res = await api<AuthContract["getPendingActions"]["result"]>(
      "/auth/api",
      { method: "POST", body },
    );

    if (!res.success) return rejectWithValue(res.message);
    return res.payload;
  },
  smartThunkOptions({ typePrefix: "auth/getPendingActions" }),
);

// H. Approve User (Admin)
const approveUser = createAsyncThunk<
  boolean,
  WithConfig<AuthContract["approveUser"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/approveUser",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = { op: "approveUser", ...params };

    const res = await api<AuthContract["approveUser"]["result"]>("/auth/api", {
      method: "POST",
      body,
    });

    if (!res.success) return rejectWithValue(res.message);
    return res.success;
  },
  smartThunkOptions({ typePrefix: "auth/approveUser" }),
);

// I. Resolve Password Reset (Admin)
const resolvePasswordReset = createAsyncThunk<
  boolean,
  WithConfig<AuthContract["resolvePasswordReset"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/resolvePasswordReset",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = {
      op: "resolvePasswordReset",
      ...params,
    };

    const res = await api<AuthContract["resolvePasswordReset"]["result"]>(
      "/auth/api",
      { method: "POST", body },
    );

    if (!res.success) return rejectWithValue(res.message);
    return res.success;
  },
  smartThunkOptions({ typePrefix: "auth/resolvePasswordReset" }),
);

// J. Change Password (User)
const changePassword = createAsyncThunk<
  boolean,
  WithConfig<AuthContract["changePassword"]["params"]>,
  { rejectValue: string; state: AppState }
>(
  "auth/changePassword",
  async ({ params }, { rejectWithValue }) => {
    const body: OpMap<AuthContract> = {
      op: "changePassword",
      ...params,
    };

    const res = await api<AuthContract["changePassword"]["result"]>(
      "/auth/api",
      { method: "POST", body },
    );

    if (!res.success) return rejectWithValue(res.message);
    return res.success;
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
      state.registrationEligibility = action.payload;
      // Cache the result
      state.checkedIds[action.meta.arg.params.saId] = action.payload;
    });

    // Register
    builder.addCase(register.fulfilled, (state, action) => {
      // action.payload is User
      state.user = action.payload;
      state.isAuthenticated = true;
      state.registrationEligibility = null; // Cleanup
    });

    // Login
    builder.addCase(login.pending, (state) => {
      state.invalidCredentialsEntered = false;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      // action.payload is User
      state.user = action.payload;
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
      state.pendingAdminActions.appliedUsers = [];
      state.pendingAdminActions.pendingResets = [];
    });

    // Check Auth
    builder.addCase(checkAuth.pending, (state) => {
      state.isInitialized = false;
    });
    builder.addCase(checkAuth.fulfilled, (state, action) => {
      // action.payload is User
      state.user = action.payload;
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
      // action.payload is { appliedUsers, pendingResets }
      state.pendingAdminActions = action.payload;
    });

    // Approve User
    builder.addCase(approveUser.fulfilled, (state, action) => {
      // Optimistic update: Remove the approved user from the list
      state.pendingAdminActions.appliedUsers =
        state.pendingAdminActions.appliedUsers.filter(
          (u) => u.userName !== action.meta.arg.params.userName,
        );
    });

    // Resolve Password Reset
    builder.addCase(resolvePasswordReset.fulfilled, (state, action) => {
      // Optimistic update: Remove the resolved request from the list
      state.pendingAdminActions.pendingResets =
        state.pendingAdminActions.pendingResets.filter(
          (r) => r.userName !== action.meta.arg.params.userName,
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
    adminPendingUsers: (state) => state.pendingAdminActions.appliedUsers,
    adminPendingResets: (state) => state.pendingAdminActions.pendingResets,
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
