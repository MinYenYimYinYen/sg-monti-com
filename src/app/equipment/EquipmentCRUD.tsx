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
import { CardHeader, CardTitle, CardDescription } from "@/style/components/card";
import { equipmentSelect } from "@/app/equipment/equipmentSelect";
import { useEquipment } from "@/app/equipment/useEquipment";
import { EquipmentForm } from "@/app/equipment/EquipmentForm";
import { EquipmentDoc } from "@/app/equipment/EquipmentTypes";

export function EquipmentCRUD() {
  useEquipment({ autoLoad: true });
  const equipmentDocs = useSelector(equipmentSelect.equipmentDocs);

  return (
    <div className="h-full w-full pt-2">
      <CardStack>
        <CardStackList>
          {/* Create card */}
          <CardStackCard id="create" variant="create" className="w-[50%]">
            <CardStackHeader>
              <CardHeader>
                <CardTitle>Add Equipment</CardTitle>
                <CardDescription>Define a new piece of equipment</CardDescription>
              </CardHeader>
            </CardStackHeader>
            <ConditionalEquipmentForm cardId="create" />
          </CardStackCard>

          {/* One card per equipment item */}
          {equipmentDocs.map((doc) => (
            <CardStackCard key={doc.equipmentId} id={doc.equipmentId} className="w-[50%]">
              <CardStackHeader>
                <CardHeader>
                  <CardTitle>{doc.equipmentId}</CardTitle>
                  <CardDescription>{doc.description}</CardDescription>
                </CardHeader>
              </CardStackHeader>
              <ConditionalEquipmentForm cardId={doc.equipmentId} equipment={doc} />
            </CardStackCard>
          ))}
        </CardStackList>
      </CardStack>
    </div>
  );
}

function ConditionalEquipmentForm({
  cardId,
  equipment,
}: {
  cardId: string;
  equipment?: EquipmentDoc;
}) {
  const { selectedId } = useCardStack();

  if (selectedId !== cardId) {
    return null;
  }

  return <EquipmentForm equipment={equipment} />;
}
