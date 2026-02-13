import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { createSelector } from "@reduxjs/toolkit";
import { baseGlobalSettings } from "@/app/globalSettings/_lib/baseGlobalSettings";
import { typeGuard } from "@/lib/typeGuard";

const lyServices = createSelector(
  [centralSelect.services, globalSettingsSelect.season],
  (services, season) =>
    services.filter(
      (s) => (s.season = (season || baseGlobalSettings.season) - 1),
    ),
);

const tyServices = createSelector(
  [centralSelect.services, globalSettingsSelect.season],
  (services, season) =>
    services.filter((s) => (s.season = season || baseGlobalSettings.season)),
);

const lyProductions = createSelector([lyServices], (lyServices) => {
  const productions = typeGuard.definedArray(
    lyServices.map((service) => service.productionCore),
  );
  return productions;
});

const tyProductions = createSelector([tyServices], (tyServices) => {
  const productions = typeGuard.definedArray(
    tyServices.map((service) => service.productionCore),
  );
  return productions;
});

const usedProducts = createSelector([lyProductions], (lyProductions) => {
  const usedProducts = lyProductions.flatMap((prod) => {
    return prod.usedAppProductCores;
  });
  return usedProducts;
});

export const bizPlanProductSelectors = {
  lyProductions,
  tyProductions,
};
