"use client";

import { useRef } from "react";
import { useSelector } from "react-redux";
import { Button } from "@/style/components/button";
import { Notice } from "@/app/permission/_components/Notice";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { can } from "@/permission/can";
import { CardList } from "@/app/study/review/_components/CardList";
import type { StudyCardDoc } from "@/app/study/StudyTypes";
import { STUDY_CONFIG } from "@/app/study/studyConst";
import { usePicturePaste } from "@/app/study/usePicturePaste";

/**
 * Picture cards waiting for a picture. One card is active; Ctrl+V (or choosing a file) attaches to
 * it and moves on to the next. Clicking a row's "Use this one" makes it the target.
 */
export function PicturePanel({ cards }: { cards: StudyCardDoc[] }) {
  const waitingCardKeys = cards.map((card) => card.cardKey);
  const { activeCardKey, isWorking, lastError, chooseCard, attachChosenFile } = usePicturePaste({ waitingCardKeys });
  const allows = useSelector(userCapabilitiesSelect.allows);
  const canWrite = allows(can.studyCardAdmin.write);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limitKb = Math.round(STUDY_CONFIG.images.maxImageBytes / 1024);
  const activeCard = cards.find((card) => card.cardKey === activeCardKey) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {cards.length > 0 && canWrite && (
        <Notice>
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {isWorking
                ? "Preparing the picture..."
                : activeCard
                  ? `Snip a picture of "${activeCard.answer.format === "text" ? activeCard.answer.text : activeCard.prompt}", then press Ctrl+V. It moves on to the next card by itself.`
                  : "Nothing is waiting for a picture."}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) attachChosenFile(file);
                event.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="primary"
              intensity="soft"
              disabled={isWorking || activeCard === null}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose a file instead
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Pictures are shrunk to fit {limitKb} KB. Press Win+Shift+S to snip on Windows.
          </p>
        </Notice>
      )}
      {lastError !== null && <Notice tone="warning">{lastError}</Notice>}
      <CardList
        tab="needsPicture"
        cards={cards}
        activeCardKey={activeCardKey}
        extraRowActions={(card) =>
          card.cardKey === activeCardKey ? null : (
            <Button size="sm" variant="primary" intensity="ghost" onClick={() => chooseCard(card.cardKey)}>
              Use this one
            </Button>
          )
        }
      />
    </div>
  );
}
