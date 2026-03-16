import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppMethodSolver } from "../AppMethodSolver";
import { createAppMethodSelect } from "./createAppMethodSelect";
import { createAppMethodActions } from "./createAppMethodSlice";
import { AppDispatch } from "@/store/index";

/**
 * Hook that subscribes to form state and dispatches validation/solver results to Redux
 * Automatically builds AppMethodParams from Redux state and runs validation/solve
 */
export function useSolver() {
  const dispatch = useDispatch<AppDispatch>();
  const params = useSelector(createAppMethodSelect.params);

  useEffect(() => {
    const validation = AppMethodSolver.validate(params);
    dispatch(createAppMethodActions.setValidation(validation));

    if (validation.canSolve || validation.canValidate) {
      const solverResult = AppMethodSolver.solve(params);
      dispatch(createAppMethodActions.setSolverResult(solverResult));
    } else {
      dispatch(createAppMethodActions.setSolverResult(null));
    }
  }, [params, dispatch]);
}
