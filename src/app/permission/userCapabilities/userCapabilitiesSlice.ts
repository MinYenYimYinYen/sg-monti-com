import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { UserCapabilitiesContract } from "@/app/permission/userCapabilities/api/UserCapabilitiesContract";
import { UserCapabilitiesDoc } from "@/app/permission/userCapabilities/UserCapabilitiesTypes";
import { upsertCapabilityBundle } from "@/app/permission/capabilityBundle/capabilityBundleSlice";
import { authActions } from "@/app/auth/authSlice";
import type { Capability } from "@/permission/PermissionTypes";
import { toUserSummary, UserSummary } from "@/permission/logic/userSummary";

/** The signed-in user's own resolved capabilities, for <Can>. `isSuperUser` is server-confirmed. */
export type MyCapabilities = { capabilities: Capability[]; isSuperUser: boolean };

type UserCapabilitiesState = {
  users: UserSummary[];
  docs: UserCapabilitiesDoc[];
  mine: MyCapabilities | null;
};

const initialState: UserCapabilitiesState = {
  users: [],
  docs: [],
  mine: null,
};

const API_PATH = "/permission/userCapabilities/api";

export const listUsers = createStandardThunk<UserCapabilitiesContract, "listUsers">({
  typePrefix: "userCapabilities/listUsers",
  apiPath: API_PATH,
  opName: "listUsers",
});

export const getAllUserCapabilities = createStandardThunk<UserCapabilitiesContract, "getAll">({
  typePrefix: "userCapabilities/getAll",
  apiPath: API_PATH,
  opName: "getAll",
});

export const getMyCapabilities = createStandardThunk<UserCapabilitiesContract, "getMine">({
  typePrefix: "userCapabilities/getMine",
  apiPath: API_PATH,
  opName: "getMine",
});

export const assignCapabilityBundle = createStandardThunk<UserCapabilitiesContract, "assignBundle">({
  typePrefix: "userCapabilities/assignBundle",
  apiPath: API_PATH,
  opName: "assignBundle",
});

export const removeCapabilityBundleFromUser = createStandardThunk<UserCapabilitiesContract, "removeBundle">({
  typePrefix: "userCapabilities/removeBundle",
  apiPath: API_PATH,
  opName: "removeBundle",
});

export const addDirectCapability = createStandardThunk<UserCapabilitiesContract, "addDirect">({
  typePrefix: "userCapabilities/addDirect",
  apiPath: API_PATH,
  opName: "addDirect",
});

export const removeDirectCapability = createStandardThunk<UserCapabilitiesContract, "removeDirect">({
  typePrefix: "userCapabilities/removeDirect",
  apiPath: API_PATH,
  opName: "removeDirect",
});

function replaceDoc({ docs, saved }: { docs: UserCapabilitiesDoc[]; saved: UserCapabilitiesDoc }) {
  const existingIndex = docs.findIndex((doc) => doc.userName === saved.userName);
  if (existingIndex >= 0) {
    docs[existingIndex] = saved;
  } else {
    docs.push(saved);
  }
}

const userCapabilitiesSlice = createSlice({
  name: "userCapabilities",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(listUsers.fulfilled, (state, action) => {
      state.users = action.payload;
    });
    builder.addCase(getAllUserCapabilities.fulfilled, (state, action) => {
      state.docs = action.payload;
    });
    builder.addCase(getMyCapabilities.fulfilled, (state, action) => {
      state.mine = action.payload;
    });

    for (const assignmentThunk of [
      assignCapabilityBundle,
      removeCapabilityBundleFromUser,
      addDirectCapability,
      removeDirectCapability,
    ]) {
      builder.addCase(assignmentThunk.fulfilled, (state, action) => {
        replaceDoc({ docs: state.docs, saved: action.payload });
      });
    }

    // Saving a bundle can remove now-redundant direct grants from its holders; keep our copy in step.
    builder.addCase(upsertCapabilityBundle.fulfilled, (state, action) => {
      for (const saved of action.payload.updatedUsers) replaceDoc({ docs: state.docs, saved });
    });

    // A later login in the same tab must not see the previous user's capabilities.
    builder.addCase(authActions.logout.fulfilled, () => initialState);

    // A deleted user leaves the list, and their assignments document goes with them (the server
    // deletes it), so no stale holdings are shown.
    builder.addCase(authActions.deleteUser.fulfilled, (state, action) => {
      const { userName } = action.payload;
      state.users = state.users.filter((user) => user.userName !== userName);
      state.docs = state.docs.filter((doc) => doc.userName !== userName);
    });

    // A user created from the Users screen appears in the list without a refetch.
    builder.addCase(authActions.createUser.fulfilled, (state, action) => {
      const created = toUserSummary(action.payload);
      if (!state.users.some((user) => user.userName === created.userName)) state.users.push(created);
    });
  },
});

export const userCapabilitiesActions = {
  ...userCapabilitiesSlice.actions,
  listUsers,
  getAllUserCapabilities,
  getMyCapabilities,
  assignCapabilityBundle,
  removeCapabilityBundleFromUser,
  addDirectCapability,
  removeDirectCapability,
};

export default userCapabilitiesSlice.reducer;
