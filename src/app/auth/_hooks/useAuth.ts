import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { authActions } from "@/app/auth/authSlice";
import { AuthContract } from "@/app/auth/_types/AuthContract";
import { WithConfig } from "@/store/reduxUtil/reduxTypes";

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();

  const login = (params: WithConfig<AuthContract["login"]["params"]>) => {
    return dispatch(authActions.login(params));
  };

  const logout = (
    params: WithConfig<AuthContract["logout"]["params"]> = {},
  ) => {
    return dispatch(authActions.logout(params));
  };

  const register = (
    params: WithConfig<AuthContract["register"]["params"]>,
  ) => {
    return dispatch(authActions.register(params));
  };

  const checkEligibility = (
    params: WithConfig<AuthContract["checkEligibility"]["params"]>,
  ) => {
    return dispatch(authActions.checkEligibility(params));
  };

  const checkAuth = (
    params: WithConfig<AuthContract["checkAuth"]["params"]> = {},
  ) => {
    return dispatch(authActions.checkAuth(params));
  };

  const requestPasswordReset = (
    params: WithConfig<AuthContract["requestPasswordReset"]["params"]>,
  ) => {
    return dispatch(authActions.requestPasswordReset(params));
  };

  const getPendingActions = (
    params: WithConfig<AuthContract["getPendingActions"]["params"]> = {},
  ) => {
    return dispatch(authActions.getPendingActions(params));
  };

  const approveUser = (
    params: WithConfig<AuthContract["approveUser"]["params"]>,
  ) => {
    return dispatch(authActions.approveUser(params));
  };

  const resolvePasswordReset = (
    params: WithConfig<AuthContract["resolvePasswordReset"]["params"]>,
  ) => {
    return dispatch(authActions.resolvePasswordReset(params));
  };

  const changePassword = (
    params: WithConfig<AuthContract["changePassword"]["params"]>,
  ) => {
    return dispatch(authActions.changePassword(params));
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
