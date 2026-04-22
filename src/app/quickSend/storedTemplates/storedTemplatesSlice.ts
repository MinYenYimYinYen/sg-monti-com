import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import { StoredTemplatesContract } from "./storedTemplatesContract";
import { StoredTemplateDoc, TemplateGroupDoc } from "./StoredTemplateTypes";

type StoredTemplatesState = {
  templates: StoredTemplateDoc[];
  groups: TemplateGroupDoc[];
};

const initialState: StoredTemplatesState = {
  templates: [],
  groups: [],
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

const getTemplates = createStandardThunk<StoredTemplatesContract, "getTemplates">({
  typePrefix: "storedTemplates/getTemplates",
  apiPath: "/quickSend/storedTemplates/api",
  opName: "getTemplates",
});

const getGroups = createStandardThunk<StoredTemplatesContract, "getGroups">({
  typePrefix: "storedTemplates/getGroups",
  apiPath: "/quickSend/storedTemplates/api",
  opName: "getGroups",
});

const saveTemplate = createStandardThunk<StoredTemplatesContract, "saveTemplate">({
  typePrefix: "storedTemplates/saveTemplate",
  apiPath: "/quickSend/storedTemplates/api",
  opName: "saveTemplate",
});

const deleteTemplate = createStandardThunk<StoredTemplatesContract, "deleteTemplate">({
  typePrefix: "storedTemplates/deleteTemplate",
  apiPath: "/quickSend/storedTemplates/api",
  opName: "deleteTemplate",
});

const createGroup = createStandardThunk<StoredTemplatesContract, "createGroup">({
  typePrefix: "storedTemplates/createGroup",
  apiPath: "/quickSend/storedTemplates/api",
  opName: "createGroup",
});

const renameGroup = createStandardThunk<StoredTemplatesContract, "renameGroup">({
  typePrefix: "storedTemplates/renameGroup",
  apiPath: "/quickSend/storedTemplates/api",
  opName: "renameGroup",
});

const deleteGroup = createStandardThunk<StoredTemplatesContract, "deleteGroup">({
  typePrefix: "storedTemplates/deleteGroup",
  apiPath: "/quickSend/storedTemplates/api",
  opName: "deleteGroup",
});

const moveTemplate = createStandardThunk<StoredTemplatesContract, "moveTemplate">({
  typePrefix: "storedTemplates/moveTemplate",
  apiPath: "/quickSend/storedTemplates/api",
  opName: "moveTemplate",
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const storedTemplatesSlice = createSlice({
  name: "storedTemplates",
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

export const storedTemplatesReducer = storedTemplatesSlice.reducer;
export const storedTemplatesActions = {
  ...storedTemplatesSlice.actions,
  getTemplates,
  getGroups,
  saveTemplate,
  deleteTemplate,
  createGroup,
  renameGroup,
  deleteGroup,
  moveTemplate,
};
