import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { StudyReviewWorkspace } from "@/app/study/review/_components/StudyReviewWorkspace";
import { can } from "@/permission/can";

export default function StudyReviewPage() {
  return (
    <GatedPanel requirement={can.studyCardAdmin.read}>
      <StudyReviewWorkspace />
    </GatedPanel>
  );
}
