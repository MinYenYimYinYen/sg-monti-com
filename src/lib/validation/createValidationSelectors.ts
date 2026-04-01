// Generic factory that works with ANY validator + form state
import { AppState } from "@/store";
import { BaseValidator } from "@/lib/validation/BaseValidator";
import { createSelector } from "@reduxjs/toolkit";

export function createValidationSelectors<T extends object>(config: {
  selectData: (state: AppState) => T; // e.g., (state) => state.loadoutForm.startLoadout
  selectTouchedFields: (state: AppState) => Set<string>;
  selectShowAll: (state: AppState) => boolean;
  validator: new () => BaseValidator<T>; // The validator class
}) {
  const selectIssues = createSelector([config.selectData], (data) => {
    const validator = new config.validator();
    return validator.validate(data);
  });




  const selectHasIssues = createSelector(
    [selectIssues],
    (issues) => Object.keys(issues).length > 0,
  );

  const selectShouldShowFieldIssue = (fieldPath: string) =>
    createSelector(
      [config.selectTouchedFields, config.selectShowAll],
      (touched, showAll) => showAll || touched.has(fieldPath),
    );

  const selectFieldIssue = (fieldPath: string) =>
    createSelector(
      [selectIssues, selectShouldShowFieldIssue(fieldPath)],
      (issues, shouldShow) => (shouldShow ? issues[fieldPath] : undefined),
    );

  return {
    issues: selectIssues,
    hasIssues: selectHasIssues,
    shouldShowFieldIssue: selectShouldShowFieldIssue,
    fieldIssue: selectFieldIssue,
  };
}
