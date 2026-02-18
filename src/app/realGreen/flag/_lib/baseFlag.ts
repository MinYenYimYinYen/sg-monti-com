import {
  Flag,
  FlagCore,
  FlagDoc,
  FlagDocProps,
  FlagProps,
} from "@/app/realGreen/flag/FlagTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseFlagCore: FlagCore = {
  flagId: baseNumId,
  available: true,
  desc: baseStrId,
};

export const baseFlagDocProps: FlagDocProps = {
  flagId: baseNumId,
  createdAt: "",
  updatedAt: "",
};

export const baseFlagDoc: FlagDoc = {
  ...baseFlagCore,
  ...baseFlagDocProps,
};

export const baseFlagProps: FlagProps = {};

export const baseFlag: Flag = {
  ...baseFlagDoc,
  ...baseFlagProps,
};
