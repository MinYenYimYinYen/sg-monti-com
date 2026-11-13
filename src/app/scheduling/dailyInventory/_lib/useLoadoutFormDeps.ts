import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { useEquipment } from "@/app/equipment/useEquipment";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { SchedulingCanLoad } from "@/app/scheduling/_libShared/schedulingCanLoad";

/**
 * `canLoad` comes from the page, because hooks expose actions only and do not select. Every hook
 * is still called on every render, in the same order: a flag only turns its load off.
 */
export function useLoadoutFormDeps({ canLoad }: { canLoad: SchedulingCanLoad }) {
  useCustomerContext({ contexts: ["byAssignment"] });
  useEmployee({ autoLoad: true, canLoad: canLoad.employees });
  useEquipment({ autoLoad: true, canLoad: canLoad.equipment });
  useEquipmentPackage({ autoLoad: true, canLoad: canLoad.equipmentPackages });
  useGlobalSettings({ autoLoad: true, canLoad: canLoad.globalSettings });
  useProgServ({
    autoLoad: true,
    canLoad: { progCodes: canLoad.progCodes, servCodes: canLoad.servCodes },
  });
  useProduct({
    autoLoad: true,
    canLoad: {
      products: canLoad.products,
      unitConversions: canLoad.unitConversions,
      appMethods: canLoad.appMethods,
    },
  });
  useUnitConfig({ autoLoad: true, canLoad: canLoad.unitConversions });
}
