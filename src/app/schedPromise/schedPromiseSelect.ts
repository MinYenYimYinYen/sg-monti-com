import { AppState } from "@/store";
import {
  CustPromise,
  ProgPromise,
  ServPromise,
  PromiseIssue,
} from "@/app/schedPromise/SchedPromiseTypes";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

const selectSchedPromises = (state: AppState) =>
  state.schedPromise.schedPromises;

const selectIssues = (state: AppState) =>
  state.schedPromise.issues;

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

const selectIssueEntities = createSelector(
  [selectIssues],
  (issues) => {
    const custPromiseIssues: PromiseIssue[] = [];
    const progPromiseIssues: PromiseIssue[] = [];
    const servPromiseIssues: PromiseIssue[] = [];

    issues.forEach((issue) => {
      if (issue.entityType === "customer") {
        custPromiseIssues.push(issue);
      }
      if (issue.entityType === "program") {
        progPromiseIssues.push(issue);
      }
      if (issue.entityType === "service") {
        servPromiseIssues.push(issue);
      }
    });
    return { custPromiseIssues, progPromiseIssues, servPromiseIssues };
  }
);

const selectCustPromiseIssues = createSelector(
  [selectIssueEntities],
  (issueEntities) => issueEntities.custPromiseIssues
);

const selectProgPromiseIssues = createSelector(
  [selectIssueEntities],
  (issueEntities) => issueEntities.progPromiseIssues
);

const selectServPromiseIssues = createSelector(
  [selectIssueEntities],
  (issueEntities) => issueEntities.servPromiseIssues
);

const selectCustPromiseIssueMap = createSelector(
  [selectCustPromiseIssues],
  (custIssues) =>
    new Grouper(custIssues).toUniqueMap((issue) => issue.entityId)
);

const selectProgPromiseIssueMap = createSelector(
  [selectProgPromiseIssues],
  (progIssues) =>
    new Grouper(progIssues).toUniqueMap((issue) => issue.entityId)
);

const selectServPromiseIssueMap = createSelector(
  [selectServPromiseIssues],
  (servIssues) =>
    new Grouper(servIssues).toUniqueMap((issue) => issue.entityId)
);

export const schedPromiseSelect = {
  schedPromises: selectSchedPromises,
  issues: selectIssues,
  schedPromiseEntities: selectSchedPromiseEntities,
  issueEntities: selectIssueEntities,
  custPromises: selectCustPromises,
  progPromises: selectProgPromises,
  servPromises: selectServPromises,
  custPromiseIssues: selectCustPromiseIssues,
  progPromiseIssues: selectProgPromiseIssues,
  servPromiseIssues: selectServPromiseIssues,
  custPromiseMap: selectCustPromiseMap,
  progPromiseMap: selectProgPromiseMap,
  servPromiseMap: selectServPromiseMap,
  custPromiseIssueMap: selectCustPromiseIssueMap,
  progPromiseIssueMap: selectProgPromiseIssueMap,
  servPromiseIssueMap: selectServPromiseIssueMap,
};
