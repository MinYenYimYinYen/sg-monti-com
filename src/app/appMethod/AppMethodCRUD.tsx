"use client";

import React from "react";
import { useSelector } from "react-redux";
import {
  CardStack,
  CardStackList,
  CardStackCard,
  CardStackHeader,
  CardStackBody,
  useCardStack,
} from "@/components/CardStack";
import {
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/style/components/card";
import { appMethodSelect } from "./appMethodSelect";
import { useAppMethod } from "./useAppMethod";
import { AppMethodCreate } from "./appMethodCreate/AppMethodCreate";
import { useFormFieldValues } from "@/app/appMethod/appMethodCreate/useFormFieldValues";
import { can } from "@/permission/can";
import { GatedPanel } from "@/app/permission/_components/GatedPanel";

export function AppMethodCRUD() {
  return (
    <GatedPanel requirement={can.appMethods.read}>
      <AppMethodEditor />
    </GatedPanel>
  );
}

// Mounts only once the read gate is open, so its load never fires for a user who may not read.
function AppMethodEditor() {
  useAppMethod({ autoLoad: true });
  const appMethods = useSelector(appMethodSelect.appMethodDocs);
  const {resetForm} = useFormFieldValues()

  return (
    <div className="h-full w-full pt-2">
      <CardStack onSelectedChange={resetForm}>
        <CardStackList>
          <CardStackCard id="create" variant="create" className={"w-[50%]"}>
            <CardStackHeader>
              <CardHeader>
                <CardTitle>Create New Method</CardTitle>
                <CardDescription>Add a new application method</CardDescription>
              </CardHeader>
            </CardStackHeader>
            <ConditionalAppMethodCreate cardId="create" />
          </CardStackCard>

          {appMethods.map((method) => (
            <CardStackCard key={method.appMethodId} id={method.appMethodId} className={"w-[50%]"}>
              <CardStackHeader>
                <CardHeader>
                  <CardTitle>{method.appMethodId}</CardTitle>
                  <CardDescription>{method.description}</CardDescription>
                </CardHeader>
              </CardStackHeader>
              <ConditionalAppMethodCreate cardId={method.appMethodId} method={method} />
            </CardStackCard>
          ))}
        </CardStackList>
      </CardStack>
    </div>
  );
}

function ConditionalAppMethodCreate({ cardId, method }: { cardId: string; method?: any }) {
  const { selectedId } = useCardStack();

  if (selectedId !== cardId) {
    return null;
  }

  return <AppMethodCreate method={method} />;
}
