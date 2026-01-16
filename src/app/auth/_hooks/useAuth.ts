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

  const resetEligibility = () => {
    dispatch(authActions.resetEligibility());
  };

  return {
    login,
    logout,
    register,
    checkEligibility,
    resetEligibility,
  };
};
