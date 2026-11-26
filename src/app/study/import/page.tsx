import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { StudyImportWorkspace } from "@/app/study/import/_components/StudyImportWorkspace";
import { can } from "@/permission/can";

export default function StudyImportPage() {
  return (
    <GatedPanel requirement={can.studyCardAdmin.write}>
      <StudyImportWorkspace />
    </GatedPanel>
  );
}
