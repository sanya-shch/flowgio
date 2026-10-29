/*
 * Slim Monaco setup.
 *
 * `import "monaco-editor"` pulls in every bundled language (~80 grammars) plus
 * the TypeScript / JSON / CSS / HTML language services, none of which DevCanvas
 * uses: it only has its own Monarch grammar. Importing the core API and the
 * editor features we actually rely on keeps the bundle small and avoids
 * shipping code that the CSP / dependency review would otherwise have to cover.
 *
 * The "@monaco" alias points to monaco-editor/esm/vs (see vite.config.ts), which
 * is also the only way to import its CSS because the package "exports" map
 * only exposes .js files.
 */
import * as monaco from "@monaco/editor/editor.api";

import "@monaco/base/browser/ui/codicons/codicon/codicon.css";
import "@monaco/base/browser/ui/codicons/codicon/codicon-modifiers.css";

import "@monaco/editor/browser/coreCommands";
import "@monaco/editor/common/standaloneStrings";

import "@monaco/editor/contrib/bracketMatching/browser/bracketMatching";
import "@monaco/editor/contrib/clipboard/browser/clipboard";
import "@monaco/editor/contrib/comment/browser/comment";
import "@monaco/editor/contrib/contextmenu/browser/contextmenu";
import "@monaco/editor/contrib/cursorUndo/browser/cursorUndo";
import "@monaco/editor/contrib/dnd/browser/dnd";
import "@monaco/editor/contrib/find/browser/findController";
import "@monaco/features/find/register";
import "@monaco/editor/contrib/folding/browser/folding";
import "@monaco/editor/contrib/gotoError/browser/gotoError";
import "@monaco/editor/contrib/hover/browser/hoverContribution";
import "@monaco/editor/contrib/indentation/browser/indentation";
import "@monaco/editor/contrib/linesOperations/browser/linesOperations";
import "@monaco/editor/contrib/multicursor/browser/multicursor";
import "@monaco/editor/contrib/smartSelect/browser/smartSelect";
import "@monaco/editor/contrib/snippet/browser/snippetController2";
import "@monaco/editor/contrib/suggest/browser/suggestController";
import "@monaco/editor/contrib/unicodeHighlighter/browser/unicodeHighlighter";
import "@monaco/editor/contrib/wordHighlighter/browser/wordHighlighter";
import "@monaco/editor/contrib/wordOperations/browser/wordOperations";

import EditorWorker from "@monaco/editor/editor.worker?worker";

/*
 * Only the generic editor worker is needed (no language service workers).
 * Vite emits it as a same-origin file, so the CSP can stay at
 * `worker-src 'self'`.
 */
self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

export { monaco };
