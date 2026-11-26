import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { StudyWorkspace } from "@/app/study/_components/StudyWorkspace";
import { can } from "@/permission/can";

export default function StudyPage() {
  return (
    <GatedPanel requirement={can.studyCardStudent.read}>
      <StudyWorkspace />
    </GatedPanel>
  );
}
