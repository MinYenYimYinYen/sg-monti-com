"use client";
import React, { useState } from "react";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { Container } from "@/components/Containers";
import FlagSelector from "@/app/realGreen/flag/_components/FlagSelector";
import { Flag } from "@/app/realGreen/flag/FlagTypes";
import clsx from "clsx";

export default function ListFlags() {
  useFlag({ autoLoad: true });
  const [selected, setSelected] = useState<Flag | null>(null);

  return (
    <Container variant={"page"}>
      {/* Responsive grid: 1 column on mobile, 300px sidebar + fluid content on desktop */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-[300px_1fr]">
        <FlagSelector
          onValueChange={(_, flag) => setSelected(flag)}
          // We must pass md:w-full to override the component's default md:w-[200px]
          contentClassName={clsx("max-h-[300px]")}
        />
      {selected ? <div>{selected.description}</div>: <div/>}
      </div>
    </Container>
  );
}
