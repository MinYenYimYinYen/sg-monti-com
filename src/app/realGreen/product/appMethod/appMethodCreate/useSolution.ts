import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppMethodSolver } from "../AppMethodSolver";
import { solverSelect } from "./selectors/solverSelect";
import { createAppMethodActions } from "./createAppMethodSlice";
import { AppDispatch } from "@/store";

/**
 * Hook that subscribes to form state and dispatches validation/solver results to Redux
 * Automatically builds AppMethodParams from Redux state and runs validation/solve
 */
export function useSolution() {
  const dispatch = useDispatch<AppDispatch>();
  const setSolutionLocked = (locked: boolean) => {
    dispatch(createAppMethodActions.setSolutionLocked(locked));
  };

  return {
    setSolutionLocked,
  };
}
