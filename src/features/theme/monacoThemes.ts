import { monaco } from "@/components/editor/monaco";

import type { Theme } from "@/stores/theme";

const MONACO_THEME_PREFIX = "flowgio-";

export const MONACO_THEMES: Record<Theme, string> = {
  dark: "vs-dark",
  light: "vs",
  midnight: `${MONACO_THEME_PREFIX}midnight`,
};

let midnightRegistered = false;

export function registerMonacoThemes() {
  if (midnightRegistered) {
    return;
  }

  monaco.editor.defineTheme(`${MONACO_THEME_PREFIX}midnight`, {
    base: "vs-dark",
    inherit: true,
    rules: [
      {
        token: "keyword",
        foreground: "c084fc",
      },
      {
        token: "direction",
        foreground: "60a5fa",
      },
      {
        token: "operator",
        foreground: "a78bfa",
      },
      {
        token: "string",
        foreground: "86efac",
      },
      {
        token: "comment",
        foreground: "64748b",
      },
      {
        token: "identifier",
        foreground: "e5e7eb",
      },
    ],
    colors: {
      "editor.background": "#0a0f1b",
      "editor.foreground": "#e5e9f2",
      "editorLineNumber.foreground": "#46516a",
      "editorLineNumber.activeForeground": "#8b96ad",
      "editorCursor.foreground": "#8b5cf6",
      "editor.selectionBackground": "#312e81",
      "editor.inactiveSelectionBackground": "#1e1b4b",
      "editor.lineHighlightBackground": "#111827",
      "editorIndentGuide.background": "#202a40",
      "editorIndentGuide.activeBackground": "#334155",
    },
  });

  midnightRegistered = true;
}
