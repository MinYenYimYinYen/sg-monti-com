import { usePrepayConfig } from "./config/usePrepayConfig";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { useFlag } from "@/app/realGreen/flag/useFlag";

export function usePrepayLettersDeps() {
  usePrepayConfig({ autoLoad: true });
  useGlobalSettings({ autoLoad: true });
  useFlag({ autoLoad: true });
}
