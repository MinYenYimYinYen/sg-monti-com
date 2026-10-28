import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import type { FormTemplateContract } from "./FormTemplateContract";
import type { FormTemplateDoc, FormTemplateSlotDoc } from "./FormTemplateTypes";

type FormTemplateState = {
  templates: FormTemplateDoc[];
  /** The template currently open in the editor. null = new/blank. */
  draft: FormTemplateDoc | null;
  /** Scale factor for the page preview (1.0 = full size at 96dpi). */
  previewScale: number;
  /** Whether the right panel shows the drag handles overlay or the live PDF viewer. */
  previewMode: "handles" | "pdf";
};

const initialState: FormTemplateState = {
  templates: [],
  draft: null,
  previewScale: 0.6,
  previewMode: "handles",
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

const getAll = createStandardThunk<FormTemplateContract, "getAll">({
  typePrefix: "formTemplate/getAll",
  apiPath: "/formTemplate/api",
  opName: "getAll",
});

const upsert = createStandardThunk<FormTemplateContract, "upsert">({
  typePrefix: "formTemplate/upsert",
  apiPath: "/formTemplate/api",
  opName: "upsert",
});

const deleteOne = createStandardThunk<FormTemplateContract, "deleteOne">({
  typePrefix: "formTemplate/deleteOne",
  apiPath: "/formTemplate/api",
  opName: "deleteOne",
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const formTemplateSlice = createSlice({
  name: "formTemplate",
  initialState,
  reducers: {
    /** Load a saved template into the editor. */
    setDraft: (state, action: PayloadAction<FormTemplateDoc>) => {
      state.draft = action.payload;
    },
    /** Patch top-level fields on the active draft. */
    updateDraft: (
      state,
      action: PayloadAction<Partial<Omit<FormTemplateDoc, "slots">>>,
    ) => {
      if (state.draft) {
        state.draft = { ...state.draft, ...action.payload };
      }
    },
    /** Replace the entire slots array on the draft. */
    setDraftSlots: (state, action: PayloadAction<FormTemplateSlotDoc[]>) => {
      if (state.draft) {
        state.draft.slots = action.payload;
      }
    },
    /** Add a new slot to the draft. */
    addDraftSlot: (state, action: PayloadAction<FormTemplateSlotDoc>) => {
      if (state.draft) {
        state.draft.slots.push(action.payload);
      }
    },
    /** Update a single slot by slotId. */
    updateDraftSlot: (
      state,
      action: PayloadAction<{ slotId: string; slot: FormTemplateSlotDoc }>,
    ) => {
      if (state.draft) {
        const idx = state.draft.slots.findIndex(
          (s) => s.slotId === action.payload.slotId,
        );
        if (idx !== -1) {
          state.draft.slots[idx] = action.payload.slot;
        }
      }
    },
    /** Remove a slot by slotId. */
    removeDraftSlot: (state, action: PayloadAction<string>) => {
      if (state.draft) {
        state.draft.slots = state.draft.slots.filter(
          (s) => s.slotId !== action.payload,
        );
      }
    },
    /** Reset the editor to a blank new template. */
    clearDraft: (state) => {
      state.draft = null;
    },
    setPreviewScale: (state, action: PayloadAction<number>) => {
      state.previewScale = Math.max(0.2, Math.min(2.0, action.payload));
    },
    setPreviewMode: (state, action: PayloadAction<"handles" | "pdf">) => {
      state.previewMode = action.payload;
    },
    togglePreviewMode: (state) => {
      state.previewMode = state.previewMode === "handles" ? "pdf" : "handles";
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getAll.fulfilled, (state, action) => {
      state.templates = action.payload;
    });

    builder.addCase(upsert.fulfilled, (state, action) => {
      const saved = action.payload;
      const idx = state.templates.findIndex(
        (t) => t.templateId === saved.templateId,
      );
      if (idx !== -1) {
        state.templates[idx] = saved;
      } else {
        state.templates.push(saved);
      }
      // Keep draft in sync with the saved version
      if (state.draft?.templateId === saved.templateId) {
        state.draft = saved;
      }
    });

    builder.addCase(deleteOne.fulfilled, (state, action) => {
      const deleted = action.payload;
      state.templates = state.templates.filter(
        (t) => t.templateId !== deleted.templateId,
      );
      if (state.draft?.templateId === deleted.templateId) {
        state.draft = null;
      }
    });
  },
});

export const formTemplateReducer = formTemplateSlice.reducer;
export const formTemplateActions = {
  ...formTemplateSlice.actions,
  getAll,
  upsert,
  deleteOne,
};
