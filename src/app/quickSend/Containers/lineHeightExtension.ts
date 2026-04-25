import { Extension } from "@tiptap/core";
import type { AnyCommands, CommandProps } from "@tiptap/core";

export const LINE_HEIGHT_OPTIONS = ["1.0", "1.15", "1.5", "2.0"] as const;
export type LineHeightOption = (typeof LINE_HEIGHT_OPTIONS)[number];
export const LINE_HEIGHT_DEFAULT: LineHeightOption = "1.15";

export const LineHeight = Extension.create({
  name: "lineHeight",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands(): AnyCommands {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }: CommandProps) => {
          return (
            commands.updateAttributes("paragraph", { lineHeight }) &&
            commands.updateAttributes("heading", { lineHeight })
          );
        },
      unsetLineHeight:
        () =>
        ({ commands }: CommandProps) => {
          return (
            commands.resetAttributes("paragraph", "lineHeight") &&
            commands.resetAttributes("heading", "lineHeight")
          );
        },
    };
  },
});
