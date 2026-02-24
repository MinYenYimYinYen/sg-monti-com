import { createSlice } from "@reduxjs/toolkit";
import { User } from "@/app/auth/_types/User";
import { AuthContract } from "@/app/auth/_types/AuthContract";
import { AppState } from "@/store";
import { CheckedId } from "@/app/auth/_types/authTypes";
import { PasswordResetRequest } from "@/app/auth/_types/PasswordResetRequest";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";

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
const checkEligibility = createStandardThunk<
  AuthContract,
  "checkEligibility"
>({
  typePrefix: "auth/checkEligibility",
  apiPath: "/auth/api",
  opName: "checkEligibility",
  customCondition: (arg, { getState }) => {
    const state = getState() as AppState;
    return !state.auth.checkedIds[arg.params.saId];
  },
});

// B. Register
const register = createStandardThunk<AuthContract, "register">({
  typePrefix: "auth/register",
  apiPath: "/auth/api",
  opName: "register",
});

// C. Login
const login = createStandardThunk<AuthContract, "login">({
  typePrefix: "auth/login",
  apiPath: "/auth/api",
  opName: "login",
});

// D. Logout
const logout = createStandardThunk<AuthContract, "logout">({
  typePrefix: "auth/logout",
  apiPath: "/auth/api",
  opName: "logout",
});

// E. Check Auth (Session Restoration)
const checkAuth = createStandardThunk<AuthContract, "checkAuth">({
  typePrefix: "auth/checkAuth",
  apiPath: "/auth/api",
  opName: "checkAuth",
});

// F. Request Password Reset
const requestPasswordReset = createStandardThunk<
  AuthContract,
  "requestPasswordReset"
>({
  typePrefix: "auth/requestPasswordReset",
  apiPath: "/auth/api",
  opName: "requestPasswordReset",
});

// G. Get Pending Actions (Admin)
const getPendingActions = createStandardThunk<
  AuthContract,
  "getPendingActions"
>({
  typePrefix: "auth/getPendingActions",
  apiPath: "/auth/api",
  opName: "getPendingActions",
});

// H. Approve User (Admin)
const approveUser = createStandardThunk<AuthContract, "approveUser">({
  typePrefix: "auth/approveUser",
  apiPath: "/auth/api",
  opName: "approveUser",
});

// I. Resolve Password Reset (Admin)
const resolvePasswordReset = createStandardThunk<
  AuthContract,
  "resolvePasswordReset"
>({
  typePrefix: "auth/resolvePasswordReset",
  apiPath: "/auth/api",
  opName: "resolvePasswordReset",
});

// J. Change Password (User)
const changePassword = createStandardThunk<AuthContract, "changePassword">({
  typePrefix: "auth/changePassword",
  apiPath: "/auth/api",
  opName: "changePassword",
});

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
    role: (state) => state.user?.role,
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
