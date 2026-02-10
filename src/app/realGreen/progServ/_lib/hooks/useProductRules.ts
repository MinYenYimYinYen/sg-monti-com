import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useAppDispatch } from "@/lib/hooks/redux";
import { progServActions } from "@/app/realGreen/progServ/_lib/slice/progServSlice";
import {
  ProductRuleDoc,
} from "@/app/realGreen/progServ/_lib/types/ProductRule";
import { getRuleId } from "@/app/realGreen/progServ/_lib/slice/progServActions";

type UseProductRulesProps = {
  servCodeId: string;
};

export function useProductRules({ servCodeId }: UseProductRulesProps) {
  const dispatch = useAppDispatch();
  useProduct({ autoLoad: true });

  const addProductRule = () => {
    dispatch(progServActions.addProductRule({ servCodeId }));
  };

  const removeProductRule = ({
    size,
    sizeOperator,
  }: {
    size: number;
    sizeOperator: ProductRuleDoc["sizeOperator"];
  }) => {
    dispatch(
      progServActions.removeProductRule({
        servCodeId,
        ruleId: `${size}${sizeOperator}`,
      }),
    );
  };

  const updateSize = (rule: ProductRuleDoc, size: number) => {
    dispatch(
      progServActions.updateProductRuleSize({
        servCodeId,
        ruleId: getRuleId(rule),
        size,
      }),
    );
  };

  const updateRuleOperator = (
    rule: ProductRuleDoc,
    sizeOperator: ProductRuleDoc["sizeOperator"],
  ) => {
    dispatch(
      progServActions.updateProductRuleOperator({
        servCodeId,
        ruleId: getRuleId(rule),
        sizeOperator,
      }),
    );
  };

  const addProductRuleProductMaster = (
    rule: ProductRuleDoc,
    productMasterId: number,
  ) => {
    dispatch(
      progServActions.addProductRuleProductMaster({
        servCodeId,
        ruleId: getRuleId(rule),
        productMasterId,
      }),
    );
  };

  const removeProductRuleProductMaster = (
    rule: ProductRuleDoc,
    productMasterId: number,
  ) => {
    dispatch(
      progServActions.removeProductRuleProductMaster({
        servCodeId,
        ruleId: getRuleId(rule),
        productMasterId,
      }),
    );
  };

  const addProductRuleProductSingle = (
    rule: ProductRuleDoc,
    productSingleId: number,
  ) => {
    dispatch(
      progServActions.addProductRuleProductSingle({
        servCodeId,
        ruleId: getRuleId(rule),
        productSingleId,
      }),
    );
  };

  const removeProductRuleProductSingle = (
    rule: ProductRuleDoc,
    productSingleId: number,
  ) => {
    dispatch(
      progServActions.removeProductRuleSingle({
        servCodeId,
        ruleId: getRuleId(rule),
        productSingleId,
      }),
    );
  };

  return {
    addProductRule,
    removeProductRule,
    updateSize,
    updateRuleOperator,
    addProductRuleProductMaster,
    removeProductRuleProductMaster,
    addProductRuleProductSingle,
    removeProductRuleProductSingle,
  };
}
