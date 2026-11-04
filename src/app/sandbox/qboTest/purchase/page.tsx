import { QboTestStub } from "@/app/sandbox/qboTest/_components/QboTestStub";

export default function QboTestPurchasePage() {
  return (
    <QboTestStub
      entity="Purchases"
      note="Planned for Phase C. Reading existing purchases comes first; posting new ones waits for the write phase. Paste Intuit's Purchase page to start."
    />
  );
}
