import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import type { StoredTemplates2Contract } from "./storedTemplatesContract";
import type { StoredTemplateDoc, TemplateGroupDoc } from "./StoredTemplateTypes";

type StoredTemplates2State = {
  templates: StoredTemplateDoc[];
  groups: TemplateGroupDoc[];
};

const initialState: StoredTemplates2State = {
  templates: [],
  groups: [],
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

const getTemplates = createStandardThunk<StoredTemplates2Contract, "getTemplates">({
  typePrefix: "storedTemplates2/getTemplates",
  apiPath: "/quickSend2/storedTemplates/api",
  opName: "getTemplates",
});

const getGroups = createStandardThunk<StoredTemplates2Contract, "getGroups">({
  typePrefix: "storedTemplates2/getGroups",
  apiPath: "/quickSend2/storedTemplates/api",
  opName: "getGroups",
});

const saveTemplate = createStandardThunk<StoredTemplates2Contract, "saveTemplate">({
  typePrefix: "storedTemplates2/saveTemplate",
  apiPath: "/quickSend2/storedTemplates/api",
  opName: "saveTemplate",
});

const deleteTemplate = createStandardThunk<StoredTemplates2Contract, "deleteTemplate">({
  typePrefix: "storedTemplates2/deleteTemplate",
  apiPath: "/quickSend2/storedTemplates/api",
  opName: "deleteTemplate",
});

const createGroup = createStandardThunk<StoredTemplates2Contract, "createGroup">({
  typePrefix: "storedTemplates2/createGroup",
  apiPath: "/quickSend2/storedTemplates/api",
  opName: "createGroup",
});

const renameGroup = createStandardThunk<StoredTemplates2Contract, "renameGroup">({
  typePrefix: "storedTemplates2/renameGroup",
  apiPath: "/quickSend2/storedTemplates/api",
  opName: "renameGroup",
});

const deleteGroup = createStandardThunk<StoredTemplates2Contract, "deleteGroup">({
  typePrefix: "storedTemplates2/deleteGroup",
  apiPath: "/quickSend2/storedTemplates/api",
  opName: "deleteGroup",
});

const moveTemplate = createStandardThunk<StoredTemplates2Contract, "moveTemplate">({
  typePrefix: "storedTemplates2/moveTemplate",
  apiPath: "/quickSend2/storedTemplates/api",
  opName: "moveTemplate",
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const storedTemplates2Slice = createSlice({
  name: "storedTemplates2",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getTemplates.fulfilled, (state, action) => {
      state.templates = action.payload;
    });

    builder.addCase(getGroups.fulfilled, (state, action) => {
      state.groups = action.payload;
    });

    builder.addCase(saveTemplate.fulfilled, (state, action) => {
      const saved = action.payload;
      const idx = state.templates.findIndex((t) => t.templateId === saved.templateId);
      if (idx !== -1) {
        state.templates[idx] = saved;
      } else {
        state.templates.push(saved);
      }
    });

    builder.addCase(deleteTemplate.fulfilled, (state, action) => {
      const { templateId } = action.meta.arg.params;
      state.templates = state.templates.filter((t) => t.templateId !== templateId);
    });

    builder.addCase(createGroup.fulfilled, (state, action) => {
      state.groups.push(action.payload);
    });

    builder.addCase(renameGroup.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.groups.findIndex((g) => g.groupId === updated.groupId);
      if (idx !== -1) {
        state.groups[idx] = updated;
      }
    });

    builder.addCase(deleteGroup.fulfilled, (state, action) => {
      const { groupId } = action.meta.arg.params;
      state.groups = state.groups.filter((g) => g.groupId !== groupId);
    });

    builder.addCase(moveTemplate.fulfilled, (state, action) => {
      const updated = action.payload;
      const idx = state.templates.findIndex((t) => t.templateId === updated.templateId);
      if (idx !== -1) {
        state.templates[idx] = updated;
      }
    });
  },
});

export const storedTemplates2Reducer = storedTemplates2Slice.reducer;
export const storedTemplates2Actions = {
  ...storedTemplates2Slice.actions,
  getTemplates,
  getGroups,
  saveTemplate,
  deleteTemplate,
  createGroup,
  renameGroup,
  deleteGroup,
  moveTemplate,
};
