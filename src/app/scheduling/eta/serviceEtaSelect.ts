import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectServiceEtas = (state: AppState) => state.serviceEta.serviceEtas;

const selectServiceEtaMap = createSelector([selectServiceEtas], (serviceEtas) =>
  new Grouper(serviceEtas).toUniqueMap((s) => s.servId),
);

export const serviceEtaSelect = {
  serviceEtas: selectServiceEtas,
  serviceEtaMap: selectServiceEtaMap,
}
