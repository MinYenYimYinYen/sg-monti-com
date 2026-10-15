import type { HandlerMap } from "@/lib/api/types/rpcUtils";
import type { FormTemplateContract } from "../FormTemplateContract";
import { FormTemplateModel } from "../FormTemplateModel";
import type { FormLetterTemplateDoc } from "../FormTemplateTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

/**
 * One-time migration: backfills `slotId` on any slot that was saved before the
 * slotId field was introduced. Run `getAll` once after deploying, then remove this function.
 */
function migrateSlotIds(templates: FormLetterTemplateDoc[]): FormLetterTemplateDoc[] {
  return templates.map((template) => ({
    ...template,
    slots: template.slots.map((slot, index) => ({
      ...slot,
      slotId: slot.slotId ?? `slot_migrated_${template.templateId}_${index}`,
    })),
  }));
}

const handlers: HandlerMap<FormTemplateContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await FormTemplateModel.find({}).lean();
      const cleaned = cleanMongoArray<FormLetterTemplateDoc>(docs);
      return { success: true, payload: migrateSlotIds(cleaned) };
    },
  },

  upsert: {
    roles: ["admin", "office"],
    handler: async ({ template }) => {
      await connectToMongoDB();
      const saved = await FormTemplateModel.findOneAndUpdate(
        { templateId: template.templateId },
        { $set: template },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<FormLetterTemplateDoc>(saved!) };
    },
  },

  deleteOne: {
    roles: ["admin"],
    handler: async ({ templateId }) => {
      await connectToMongoDB();
      const deleted = await FormTemplateModel.findOneAndDelete({ templateId }).lean();
      return { success: true, payload: cleanMongoObject<FormLetterTemplateDoc>(deleted!) };
    },
  },
};

export const POST = createRpcHandler<FormTemplateContract>(handlers);
