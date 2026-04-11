import { useCustomerContext } from "@/app/realGreen/customer/hooks/useCustomerContext";
import { useProgServ } from "@/app/realGreen/progServ/_lib/hooks/useProgServ";
import { useUnitConfig } from "@/app/realGreen/product/unitConfig/useUnitConfig";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { useProduct } from "@/app/realGreen/product/_lib/hooks/useProduct";
import { useEquipmentPackage } from "@/app/equipment/equipmentPackage/useEquipmentPackage";
import { useEquipment } from "@/app/equipment/useEquipment";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";

export function useLoadoutFormDeps() {
  useCustomerContext({ contexts: ["byAssignment"] });
  useEmployee({ autoLoad: true });
  useEquipment({ autoLoad: true });
  useEquipmentPackage({ autoLoad: true });
  useGlobalSettings({ autoLoad: true });
  useProgServ({ autoLoad: true });
  useProduct({ autoLoad: true });
  useUnitConfig({ autoLoad: true });



}
