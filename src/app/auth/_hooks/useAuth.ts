import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { authActions } from "@/app/auth/authSlice";
import { AuthContract } from "@/app/auth/_types/AuthContract";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";
import { User, UserWithPW } from "@/app/auth/_types/User";

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();

  const login = (params: AuthContract["login"]["params"]) => {
    return dispatch(
      authActions.login({
        params: params,
        config: { loadingMsg: "Logging in..." },
      }),
    );
  };

  const logout = () => {
    return dispatch(
      authActions.logout({
        params: {},
        config: { loadingMsg: "Logging out..." },
      }),
    );
  };

  const register = (params: AuthContract["register"]["params"]) => {
    return dispatch(
      authActions.register({
        params,
        config: { loadingMsg: "Registering..." },
      }),
    );
  };

  const checkEligibility = (
    params: AuthContract["checkEligibility"]["params"],
  ) => {
    return dispatch(
      authActions.checkEligibility({
        params,
        config: { loadingMsg: "Checking eligibility..." },
      }),
    );
  };

  const checkAuth = () => {
    return dispatch(
      authActions.checkAuth({ params: {}, config: { showLoading: false } }),
    );
  };

  const requestPasswordReset = (
    params: AuthContract["requestPasswordReset"]["params"],
  ) => {
    return dispatch(
      authActions.requestPasswordReset({
        params: { userName: params.userName },
        config: { loadingMsg: "Requesting password reset..." },
      }),
    );
  };

  const getPendingActions = (
    params: AuthContract["getPendingActions"]["params"] = {},
  ) => {
    return dispatch(
      authActions.getPendingActions({
        params: params,
        config: { showLoading: false },
      }),
    );
  };

  const approveUser = (params: AuthContract["approveUser"]["params"]) => {
    return dispatch(
      authActions.approveUser({
        params,
        config: { loadingMsg: "Approving..." },
      }),
    );
  };

  const resolvePasswordReset = (
    params: AuthContract["resolvePasswordReset"]["params"],
  ) => {
    return dispatch(
      authActions.resolvePasswordReset({
        params,
        config: { loadingMsg: "Updating password..." },
      }),
    );
  };

  const changePassword = (params: AuthContract["changePassword"]["params"]) => {
    return dispatch(
      authActions.changePassword({
        params,
        config: { loadingMsg: "Updating password..." },
      }),
    );
  };

  const resetEligibility = () => {
    dispatch(authActions.resetEligibility());
  };

  const setInvalidCredentials = (invalid: boolean) => {
    dispatch(authActions.setInvalidCredentials(invalid));
  };

  const resetPasswordResetStatus = () => {
    dispatch(authActions.resetPasswordResetStatus());
  };

  return {
    login,
    logout,
    register,
    checkEligibility,
    checkAuth,
    requestPasswordReset,
    getPendingActions,
    approveUser,
    resolvePasswordReset,
    changePassword,
    resetEligibility,
    setInvalidCredentials,
    resetPasswordResetStatus,
  };
};
