import { Extension } from "@tiptap/core";
import type { AnyCommands, CommandProps } from "@tiptap/core";

export const PARAGRAPH_SPACING_OPTIONS = ["0px", "4px", "8px", "12px", "16px"] as const;
export type ParagraphSpacingOption = (typeof PARAGRAPH_SPACING_OPTIONS)[number];
export const PARAGRAPH_SPACING_DEFAULT: ParagraphSpacingOption = "4px";

export const ParagraphSpacing = Extension.create({
  name: "paragraphSpacing",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          paragraphSpacing: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginBottom || null,
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.paragraphSpacing) return {};
              return { style: `margin-bottom: ${attributes.paragraphSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands(): AnyCommands {
    return {
      setParagraphSpacing:
        (spacing: string) =>
        ({ commands }: CommandProps) => {
          return (
            commands.updateAttributes("paragraph", { paragraphSpacing: spacing }) &&
            commands.updateAttributes("heading", { paragraphSpacing: spacing })
          );
        },
      unsetParagraphSpacing:
        () =>
        ({ commands }: CommandProps) => {
          return (
            commands.resetAttributes("paragraph", "paragraphSpacing") &&
            commands.resetAttributes("heading", "paragraphSpacing")
          );
        },
    };
  },
});
