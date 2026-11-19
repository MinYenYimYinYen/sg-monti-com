import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { AskAwayWorkspace } from "@/app/askAway/_components/AskAwayWorkspace";
import { can } from "@/permission/can";

// Three gates because it reads the knowledge base and its settings (the prompt) and spends money on
// Claude, and a gate takes one capability. The workspace sits inside all of them, so its load hooks
// only run for a user who holds every one.
export default function AskAwayPage() {
  return (
    <GatedPanel requirement={can.knowledgeTopics.read}>
      <GatedPanel requirement={can.knowledgeSettings.read}>
        <GatedPanel requirement={can.claudeRequests.write}>
          <AskAwayWorkspace />
        </GatedPanel>
      </GatedPanel>
    </GatedPanel>
  );
}
