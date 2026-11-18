"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/style/components/button";
import { TEXTAREA_CLASS_NAME } from "@/app/knowledgeBase/editor/_components/editorFieldStyles";

const DEFAULT_PLACEHOLDER = "Ask something. Enter sends, Shift+Enter adds a line.";

export function ChatInput({
  disabled,
  onSendAction,
  placeholder = DEFAULT_PLACEHOLDER,
}: {
  disabled: boolean;
  onSendAction: (text: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");

  function submit() {
    if (disabled || text.trim() === "") return;
    onSendAction(text);
    setText("");
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        className={TEXTAREA_CLASS_NAME}
        rows={3}
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <Button onClick={submit} disabled={disabled || text.trim() === ""}>
        <Send className="mr-2 h-4 w-4" />
        Send
      </Button>
    </div>
  );
}
