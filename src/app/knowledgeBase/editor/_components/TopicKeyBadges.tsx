import { Badge } from "@/style/components/badge";

/** The topic tags of a document, as small chips. */
export function TopicKeyBadges({ topicKeys }: { topicKeys: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {topicKeys.map((topicKey) => (
        <Badge key={topicKey} variant="accent" intensity="ghost" className="px-1.5 py-0 font-medium">
          {topicKey}
        </Badge>
      ))}
    </div>
  );
}
