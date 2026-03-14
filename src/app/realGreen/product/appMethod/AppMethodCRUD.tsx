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
import { AppMethodCreate } from "./AppMethodCreate";
import { AppMethodEdit } from "./AppMethodEdit";

export function AppMethodCRUD() {
  useAppMethod({ autoLoad: true });
  const appMethods = useSelector(appMethodSelect.appMethods);

  return (
    <div className="h-full w-full">
      <CardStack>
        <CardStackList>
          <CardStackCard id="create" variant="create">
            <AppMethodCreate />
          </CardStackCard>

          {appMethods.map((method) => (
            <CardStackCard key={method.appMethodId} id={method.appMethodId}>
              <AppMethodEdit method={method} />
            </CardStackCard>
          ))}
        </CardStackList>
      </CardStack>
    </div>
  );
}
