import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useFullSeasonServices } from "@/app/realGreen/customer/hooks/useFullSeasonServices";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useFlagRule } from "@/app/flagRule/useFlagRule";
import { useFlagRuleCustFlags } from "@/app/sanity/flags/useFlagRuleCustFlags";
import { useRenewalFlagIds } from "@/app/globalSettings/_lib/useRenewalFlagIds";
import { useCallAhead } from "@/app/realGreen/callAhead/useCallAhead";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useSelector } from "react-redux";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { sanityActions } from "@/app/sanity/sanitySlice";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import {
  fullSeasonServicesGetDocs,
} from "@/app/realGreen/customer/slices/customerSlices";
import { progServActions } from "@/app/realGreen/progServ/_lib/slice/progServSlice";
import { flagActions } from "@/app/realGreen/flag/flagSlice";
import { flagRuleActions } from "@/app/flagRule/flagRuleSlice";
import { callAheadActions } from "@/app/realGreen/callAhead/callAheadSlice";

export function useSanityDeps() {
  const dispatch = useAppDispatch();
  const globalSeason = useSelector(globalSettingsSelect.season);
  const seasonOverride = useSelector(sanitySelect.seasonOverride);

  // Effective season: use the override if set, otherwise fall back to globalSettings.season
  const season = seasonOverride ?? globalSeason;

  useCustomerContext({ contexts: ["fullSeasonServices"] });
  useFullSeasonServices();
  useProgServ({});
  useFlag({ autoLoad: false });
  useFlagRule({});
  useFlagRuleCustFlags();
  useRenewalFlagIds();
  useCallAhead({ autoLoad: false });

  const load = () => {
    if (!season) return;

    // Initialize seasonOverride from globalSettings.season on first load if not yet set
    if (seasonOverride === null && globalSeason !== undefined) {
      dispatch(sanityActions.setSeasonOverride(globalSeason));
    }

    dispatch(
      fullSeasonServicesGetDocs({
        params: { schemeName: "fullSeasonServices", season },
        config: { force: true, staleTime: realGreenConst.paramTypesCacheTime },
      }),
    );

    dispatch(
      progServActions.getProgCodeDocs({
        params: {},
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
          loadingMsg: "Loading program codes...",
          force: true,
        },
      }),
    );
    dispatch(
      progServActions.getServCodeDocs({
        params: {},
        config: {
          staleTime: realGreenConst.paramTypesCacheTime,
          loadingMsg: "Loading service codes...",
          force: true,
        },
      }),
    );

    dispatch(
      flagActions.getFlagDocs({
        params: {},
        config: {
          loadingMsg: "Loading flags...",
          staleTime: realGreenConst.paramTypesCacheTime,
          force: true,
        },
      }),
    );

    dispatch(
      flagRuleActions.getAll({
        params: {},
        config: { loadingMsg: "Loading flag rules...", force: true },
      }),
    );

    dispatch(
      callAheadActions.getCallAheads({
        params: {},
        config: { loadingMsg: "Loading call aheads...", force: true },
      }),
    );
    dispatch(
      callAheadActions.getKeywords({
        params: {},
        config: { loadingMsg: "Loading keywords...", force: true },
      }),
    );
  };

  return { load, season };
}
