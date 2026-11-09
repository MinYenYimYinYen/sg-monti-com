
export type RgAccountRaw = {
  accountID: string;
  accountDescription: string;
  notChange: boolean;
  cashAccount: boolean;
  accountType: string;
};

export type RgAccountCore = {
  rgAccountId: string;
  rgDescription: string;
  // leaving other properties out for now, as their accounting specs are not a source of truth - qbo is the source of truth.
};


// Departing from the original core-doc-docProps-props-entity flow in favor of simpler, separate data module to give
// us what we need for props.

// export type AccountDocProps = CreatedUpdated & {
//   accountId: string;
// };
//
// export type AccountDoc = AccountCore & AccountDocProps;

export type RgAccountProps = {};

export type RgAccount = RgAccountCore & RgAccountProps;
