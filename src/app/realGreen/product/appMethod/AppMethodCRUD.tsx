"use client";

import React from "react";
import { useSelector } from "react-redux";
import {
  CardStack,
  CardStackList,
  CardStackCard,
} from "@/components/CardStack";
import { appMethodSelect } from "./appMethodSelect";
import { useAppMethod } from "./useAppMethod";
import { AppMethodCreate } from "./appMethodCreate/AppMethodCreate";
import { loadSavedAppMethod } from "@/app/realGreen/product/appMethod/appMethodCreate/loadSavedAppMethod";

export function AppMethodCRUD() {
  useAppMethod({ autoLoad: true });
  const appMethods = useSelector(appMethodSelect.appMethodDocs);

  return (
    <div className="h-full w-full pt-2">
      <CardStack>
        <CardStackList>
          <CardStackCard id="create" variant="create" className={"w-[50%]"}>
            <AppMethodCreate />
          </CardStackCard>

          {appMethods.map((method) => (
            <CardStackCard key={method.appMethodId} id={method.appMethodId} className={"w-[50%]"}>
              <AppMethodCreate method={method}  />
            </CardStackCard>
          ))}
        </CardStackList>
      </CardStack>
    </div>
  );
}
