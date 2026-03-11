import { AppState } from "@/store";
import {
  CustPromise,
  ProgPromise,
  ServPromise,
} from "@/app/schedPromise/SchedPromiseTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectSchedPromises = (state: AppState) =>
  state.schedPromise.schedPromises;

const selectSchedPromiseEntities = createSelector(
  [selectSchedPromises],
  (schedPromises) => {
    const custPromises: CustPromise[] = [];
    const progPromises: ProgPromise[] = [];
    const servPromises: ServPromise[] = [];

    schedPromises.forEach((sp) => {
      if (sp.entityType === "customer") {
        const custPromise: CustPromise = {
          ...sp,
          custId: sp.entityId,
        };
        custPromises.push(custPromise);
      }
      if (sp.entityType === "program") {
        const progPromise: ProgPromise = {
          ...sp,
          progId: sp.entityId,
        };
        progPromises.push(progPromise);
      }
      if (sp.entityType === "service") {
        const servPromise: ServPromise = {
          ...sp,
          servId: sp.entityId,
        };
        servPromises.push(servPromise);
      }
    });
    return { custPromises, progPromises, servPromises };
  },
);

const selectCustPromises = createSelector(
  [selectSchedPromiseEntities],
  (entityPromises) => {
    return entityPromises.custPromises;
  },
);
const selectProgPromises = createSelector(
  [selectSchedPromiseEntities],
  (entityPromises) => {
    return entityPromises.progPromises;
  },
);
const selectServPromises = createSelector(
  [selectSchedPromiseEntities],
  (entityPromises) => {
    return entityPromises.servPromises;
  },
);

const selectCustPromiseMap = createSelector(
  [selectCustPromises],
  (custPromises) =>
    new Grouper(custPromises).toUniqueMap((cust) => cust.custId),
);
const selectProgPromiseMap = createSelector(
  [selectProgPromises],
  (progPromises) =>
    new Grouper(progPromises).toUniqueMap((prog) => prog.progId),
);
const selectServPromiseMap = createSelector(
  [selectServPromises],
  (servPromises) =>
    new Grouper(servPromises).toUniqueMap((serv) => serv.servId),
);

export const schedPromiseSelect = {
  schedPromises: selectSchedPromises,
  schedPromiseEntities: selectSchedPromiseEntities,
  custPromises: selectCustPromises,
  progPromises: selectProgPromises,
  servPromises: selectServPromises,
  custPromiseMap: selectCustPromiseMap,
  progPromiseMap: selectProgPromiseMap,
  servPromiseMap: selectServPromiseMap,
};
