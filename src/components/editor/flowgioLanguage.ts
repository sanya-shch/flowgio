import { monaco } from "./monaco";

export const DEV_CANVAS_LANGUAGE = "flowgio";

let isRegistered = false;

export function registerFlowgioLanguage() {
  if (isRegistered) {
    return;
  }

  isRegistered = true;

  monaco.languages.register({
    id: DEV_CANVAS_LANGUAGE,
  });

  monaco.languages.setMonarchTokensProvider(DEV_CANVAS_LANGUAGE, {
    tokenizer: {
      root: [
        [/^(\s*)(flowchart)(\s+)(TD|LR)/, ["white", "keyword", "white", "direction"]],

        [/^\s*\/\/.*$/, "comment"],

        [/--/, "operator"],

        [/->/, "operator"],

        [/["']/, "string.quote"],

        [/\[/, "delimiter.bracket"],

        [/\]/, "delimiter.bracket"],

        [/\{/, "delimiter.bracket"],

        [/\}/, "delimiter.bracket"],

        [/\(/, "delimiter.bracket"],

        [/\)/, "delimiter.bracket"],

        [/[a-zA-Z_][\w-]*/, "identifier"],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration(DEV_CANVAS_LANGUAGE, {
    comments: {
      lineComment: "//",
    },

    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],

    autoClosingPairs: [
      {
        open: "[",
        close: "]",
      },
      {
        open: "{",
        close: "}",
      },
      {
        open: "(",
        close: ")",
      },
      {
        open: '"',
        close: '"',
      },
      {
        open: "'",
        close: "'",
      },
    ],
  });
}
