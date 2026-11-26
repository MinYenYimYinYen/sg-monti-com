"use client";

import { useRef } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import type { StudyCardDoc } from "@/app/study/StudyTypes";
import { usePictureAttach } from "@/app/study/usePicturePaste";
import { useStudyCards } from "@/app/study/useStudyCards";

/** Replace or remove the picture of a draft picture card. Only shown for a card that has one. */
export function DraftPictureActions({ card }: { card: StudyCardDoc }) {
  const { removeFigure } = useStudyCards();
  // No paste listener here: a card that already has a picture is never the paste target, and one
  // listener per row would all fire on the same Ctrl+V.
  const { attachFile, isWorking } = usePictureAttach();
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.studyCardAdmin.write);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (card.kind !== "image" || card.imageKey === null) return null;
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void attachFile({ file, cardKey: card.cardKey });
          event.target.value = "";
        }}
      />
      <Button
        size="sm"
        variant="primary"
        intensity="ghost"
        disabled={!canWrite || isWorking}
        onClick={() => fileInputRef.current?.click()}
      >
        Replace picture
      </Button>
      <Button
        size="sm"
        variant="destructive"
        intensity="ghost"
        disabled={!canWrite}
        onClick={() => removeFigure(card.cardKey)}
      >
        Remove picture
      </Button>
    </>
  );
}
