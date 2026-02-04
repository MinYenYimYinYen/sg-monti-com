"use client";
import React, { useState } from "react";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { Container } from "@/components/Containers";
import { Flag } from "@/app/realGreen/flag/FlagTypes";
import EntitySelector from "@/components/EntitySelector";
import { useSelector } from "react-redux";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";

export default function ListFlags() {
  useFlag({ autoLoad: true });
  const flags = useSelector(flagSelect.flags);
  const [selected, setSelected] = useState<Flag | null>(null);

  return (
    <Container variant={"page"}>
      {/* Responsive grid: 1 column on mobile, 300px sidebar + fluid content on desktop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
        <EntitySelector
          items={flags}
          getItemId={(f) => f.flagId}
          getItemLabel={(f) => f.description}
          onValueChange={(_, flag) => setSelected(flag)}
          placeholder={"Select Flag"}
        />
        {selected ? <div>{selected.description}</div> : <div />}
      </div>
    </Container>
  );
}
