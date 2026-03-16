import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/index";
import { createAppMethodActions } from "./createAppMethodSlice";
import { FieldKey } from "./FieldSelector";

/**
 * Hook for managing the 3-field selection
 */
export function use3Fields() {
  const dispatch = useDispatch<AppDispatch>();

  const selectFields = (fields: FieldKey[]) => {
    dispatch(createAppMethodActions.setSelectedFields(fields));
  };

  return {
    selectFields,
  };
}
