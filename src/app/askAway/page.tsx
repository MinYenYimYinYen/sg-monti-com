import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { AskAwayWorkspace } from "@/app/askAway/_components/AskAwayWorkspace";
import { can } from "@/permission/can";

// Two gates because it reads the knowledge base and spends money on Claude, and a gate takes one
// capability. The workspace sits inside both, so its load hooks only run for a user who holds both.
export default function AskAwayPage() {
  return (
    <GatedPanel requirement={can.knowledgeTopics.read}>
      <GatedPanel requirement={can.claudeRequests.write}>
        <AskAwayWorkspace />
      </GatedPanel>
    </GatedPanel>
  );
}
