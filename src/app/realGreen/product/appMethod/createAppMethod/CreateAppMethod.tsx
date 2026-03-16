import {
  CardStackBody,
  CardStackCard,
  CardStackHeader,
} from "@/components/CardStack";
import { CardContent, CardHeader, CardTitle } from "@/style/components/card";
import { Label } from "@/style/components/label";
import { Input } from "@/style/components/input";
import { useState } from "react";

export function CreateAppMethod() {
  const [appMethodId, setAppMethodId] = useState("");
  return (
    <>
      <CardStackHeader>
        <CardHeader>
          <CardTitle>Create Application Method</CardTitle>
        </CardHeader>
        <CardStackBody>
          <CardContent>
            <div className={"space-y-2"}>
              <Label>App Method ID</Label>
              <Input
                value={appMethodId}
                onChange={(e) => setAppMethodId(e.target.value)}
              />

            </div>
          </CardContent>
        </CardStackBody>
      </CardStackHeader>
    </>
  );
}
