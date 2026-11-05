import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { QboConnectionContract } from "@/app/qbo/connection/api/QboConnectionContract";
import {
  QboConnectionStatus,
  QboConnectionTestResult,
} from "@/app/qbo/connection/types/QboConnectionTypes";

type QboConnectionState = {
  status: QboConnectionStatus | null;
  // Last smoke test result. It stays null if the test has not run or the last run failed.
  testResult: QboConnectionTestResult | null;
  // Set when a disconnect removed our tokens but Intuit did not confirm the revocation.
  revocationUnconfirmed: boolean;
};

const initialState: QboConnectionState = {
  status: null,
  testResult: null,
  revocationUnconfirmed: false,
};

const getQboStatus = createStandardThunk<QboConnectionContract, "status">({
  typePrefix: "qboConnection/status",
  apiPath: "/qbo/connection/api",
  opName: "status",
});

const disconnectQbo = createStandardThunk<QboConnectionContract, "disconnect">({
  typePrefix: "qboConnection/disconnect",
  apiPath: "/qbo/connection/api",
  opName: "disconnect",
});

const testQboConnection = createStandardThunk<QboConnectionContract, "testConnection">({
  typePrefix: "qboConnection/testConnection",
  apiPath: "/qbo/connection/api",
  opName: "testConnection",
});

const qboConnectionSlice = createSlice({
  name: "qboConnection",
  initialState,
  reducers: {
    dismissRevocationNotice: (state) => {
      state.revocationUnconfirmed = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getQboStatus.fulfilled, (state, action) => {
      state.status = action.payload;
    });
    builder.addCase(testQboConnection.fulfilled, (state, action) => {
      state.testResult = action.payload;
      state.status = action.payload.status;
    });
    builder.addCase(disconnectQbo.fulfilled, (state, action) => {
      state.testResult = null;
      state.status = action.payload.status;
      state.revocationUnconfirmed = !action.payload.revocationConfirmed;
    });
  },
});

export const qboConnectionActions = {
  ...qboConnectionSlice.actions,
  getQboStatus,
  disconnectQbo,
  testQboConnection,
};

export const qboConnectionReducer = qboConnectionSlice.reducer;
