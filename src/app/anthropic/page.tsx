import { GatedPanel } from "@/app/permission/_components/GatedPanel";
import { AnthropicChatWorkspace } from "@/app/anthropic/_components/AnthropicChatWorkspace";
import { can } from "@/permission/can";

// A temporary test page for the Claude API wiring. Not linked from the nav; delete when no longer needed.
export default function AnthropicPage() {
  return (
    <GatedPanel requirement={can.claudeRequests.write}>
      <AnthropicChatWorkspace />
    </GatedPanel>
  );
}
