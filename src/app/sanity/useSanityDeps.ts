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
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { progServActions } from "@/app/realGreen/progServ/_lib/slice/progServSlice";
import { flagActions } from "@/app/realGreen/flag/flagSlice";
import { flagRuleActions } from "@/app/flagRule/flagRuleSlice";
import { callAheadActions } from "@/app/realGreen/callAhead/callAheadSlice";

/**
 * One flag per read the sanity screens load. They come from the layout, because hooks expose
 * actions only and do not select. Each defaults to allowed.
 */
export type SanityCanLoad = {
  customers: boolean;
  progCodes: boolean;
  servCodes: boolean;
  flags: boolean;
  flagRules: boolean;
  customerFlags: boolean;
  callAheads: boolean;
  keywords: boolean;
  globalSettings: boolean;
};

export function useSanityDeps({
  canLoad = {},
}: { canLoad?: Partial<SanityCanLoad> } = {}) {
  const {
    customers: canLoadCustomers = true,
    progCodes: canLoadProgCodes = true,
    servCodes: canLoadServCodes = true,
    flags: canLoadFlags = true,
    flagRules: canLoadFlagRules = true,
    customerFlags: canLoadCustomerFlags = true,
    callAheads: canLoadCallAheads = true,
    keywords: canLoadKeywords = true,
    globalSettings: canLoadGlobalSettings = true,
  } = canLoad;
  const dispatch = useAppDispatch();
  const sanitySeason = useSelector(sanitySelect.sanitySeason);

  useCustomerContext({ contexts: ["fullSeasonServices"] });
  const { refresh: refreshFullSeasonServices } = useFullSeasonServices({
    seasonOverride: sanitySeason ?? undefined,
    canLoad: canLoadCustomers,
  });
  useProgServ({
    canLoad: { progCodes: canLoadProgCodes, servCodes: canLoadServCodes },
  });
  useFlag({ autoLoad: false, canLoad: canLoadFlags });
  useFlagRule({ canLoad: canLoadFlagRules });
  const { reload: reloadCustFlags } = useFlagRuleCustFlags({
    canLoad: canLoadCustomerFlags,
  });
  useRenewalFlagIds({ canLoad: canLoadGlobalSettings });
  useCallAhead({
    autoLoad: false,
    canLoad: { callAheads: canLoadCallAheads, keywords: canLoadKeywords },
  });

  const load = () => {
    if (!sanitySeason) return;

    refreshFullSeasonServices();
    reloadCustFlags();

    if (canLoadProgCodes) {
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
    }
    if (canLoadServCodes) {
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
    }

    if (canLoadFlags) {
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
    }

    if (canLoadFlagRules) {
      dispatch(
        flagRuleActions.getAll({
          params: {},
          config: { loadingMsg: "Loading flag rules...", force: true },
        }),
      );
    }

    if (canLoadCallAheads) {
      dispatch(
        callAheadActions.getCallAheads({
          params: {},
          config: { loadingMsg: "Loading call aheads...", force: true },
        }),
      );
    }
    if (canLoadKeywords) {
      dispatch(
        callAheadActions.getKeywords({
          params: {},
          config: { loadingMsg: "Loading keywords...", force: true },
        }),
      );
    }
  };

  return { load, season: sanitySeason };
}
