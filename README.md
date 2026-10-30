# Flowgio

[![CI](https://github.com/sanya-shch/flowgio/actions/workflows/ci.yml/badge.svg)](https://github.com/sanya-shch/flowgio/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/sanya-shch/flowgio/graph/badge.svg)](https://codecov.io/gh/sanya-shch/flowgio)
[![License: MIT](https://img.shields.io/github/license/sanya-shch/flowgio)](LICENSE)

A diagram-as-code editor: write a small text DSL on one side, see it rendered
as an interactive flowchart on the other — auto-laid-out, draggable,
exportable, and shareable via a URL.

## Features

- **Text-to-diagram DSL** — a small `flowchart` syntax, parsed live as you
  type, with inline error reporting that never clobbers the last valid render.
- **Interactive canvas** — pan, zoom, drag nodes, auto-layout, undo/redo.
- **Keyboard-first editing** — select, delete, and nudge nodes without a
  mouse; see [Keyboard shortcuts](#keyboard-shortcuts) below.
- **Local persistence** — diagrams save to IndexedDB, autosave in the
  background, and recover an unsaved draft if the tab closes mid-edit.
- **Export** — SVG, PNG, and a round-trippable `.flowgio` file format.
- **Share links** — encode a diagram straight into a URL, no server needed.
- **Embed mode** — drop a read-only diagram into another page via `<iframe>`.
- **Tutorials** — a few worked examples of the DSL, built into the app.
- **Light / dark / midnight themes**, synced between the canvas and the
  Monaco editor.

## Tech stack

- [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) + TypeScript
- [Vite](https://vite.dev/) for dev/build
- [Pinia](https://pinia.vuejs.org/) for state
- [Vue Router](https://router.vuejs.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the DSL
  editor, with a custom language definition. Only the core editor and the
  features Flowgio uses are bundled (see `src/components/editor/monaco.ts`),
  not the ~80 built-in languages and TypeScript/JSON/CSS/HTML services
- IndexedDB for local storage (diagrams + crash-recovery drafts)
- [Vitest](https://vitest.dev/) + [@vue/test-utils](https://test-utils.vuejs.org/)
  for unit/integration tests
- [Playwright](https://playwright.dev/) for end-to-end tests

## Quick start

Requires Node 20+ (see [`.nvmrc`](./.nvmrc); developed against Node 22).

```bash
git clone https://github.com/sanya-shch/flowgio.git
cd flowgio
npm install
npm run dev
```

Open the printed local URL — the editor loads at `/editor` with a starter
diagram.

## The DSL

A diagram is a `flowchart` declaration followed by node and edge statements.

```
flowchart LR

Browser["Web Browser"] -- HTTP request -> API["REST API"]
API -- "SQL query" -> Database(PostgreSQL)
API -- 'cache lookup' -> Redis{Redis Cache}
```

- **Direction**: the first line must be `flowchart LR` (left-to-right) or
  `flowchart TD` (top-down).
- **Nodes**: `id`, `id[Label]`, `id{Label}`, or `id(Label)` — the three
  bracket styles are equivalent label delimiters, not shape selectors (use
  `"..."` or `'...'` inside them for labels containing spaces or special
  characters). A node's **shape** — rectangle, rounded, circle, or diamond —
  is set from the inspector panel after selecting it on the canvas, not from
  the syntax, and is preserved across edits.
- **Edges**: `from -> to`, or `from -- label -> to` / `from -- "label" -> to`
  for a labeled edge.
- Reference a node by its `id` after its first definition to add more edges
  from/to it without repeating the label.
- `// ...` starts a line comment.

Parse errors are shown inline with a line number, and the canvas keeps
rendering the last valid diagram until the source is valid again.

## Keyboard shortcuts

| Keys                                     | Action                                                  |
| ---------------------------------------- | ------------------------------------------------------- |
| `Cmd/Ctrl + Z`                           | Undo                                                    |
| `Cmd/Ctrl + Shift + Z` or `Cmd/Ctrl + Y` | Redo                                                    |
| `Delete` / `Backspace`                   | Delete the selected node                                |
| Arrow keys (`Shift` for larger steps)    | Move the selected (focused) node                        |
| `Escape`                                 | Deselect the current node / close the shortcuts overlay |
| `Cmd/Ctrl + Enter`                       | Parse immediately                                       |
| `Cmd/Ctrl + 0`                           | Reset zoom and pan                                      |
| `?`                                      | Show the shortcuts overlay                              |

Diagram nodes are keyboard-focusable (`Tab`) and announce their label and
shape to screen readers; `Enter`/`Space` selects a focused node.

## Embedding a diagram

`/embed` renders a single, read-only diagram with no editor chrome — meant
for dropping into an `<iframe>` on another page:

```html
<iframe
  src="https://your-deployment/embed?source=flowchart%20LR%0A%0AA-%3EB"
  width="100%"
  height="400"
  style="border: 0"
  sandbox="allow-scripts allow-popups"
></iframe>
```

The embed itself is read-only, writes nothing to local storage, and never
touches the host page's cookies or storage — but as a general rule for
embedding any third-party iframe, scope its permissions with sandbox
rather than trusting it by default. allow-scripts is required (it's a
Vue app); allow-popups lets the "Edit on Flowgio" badge open in a new
tab. Omit allow-same-origin unless you specifically need it — this embed
doesn't.

Supported query parameters:

- `source` — URL-encoded DSL source (as above), **or**
- a `#share=...` hash (the same format `createShareUrl()` produces from the
  editor's Share button) — either works.
- `theme` — `light`, `dark`, or `midnight`. Applies to that embed only; it
  never touches the visitor's saved theme preference for the main app.

Panning and zooming still work in embed mode; dragging, selecting, and
editing nodes are disabled.

If the source or share link is invalid (or exceeds the limits below), the
embed shows a short error message instead of a blank frame. If the app is
deployed under a sub-path (e.g. GitHub Pages at `/<repo>/`), include it in the
`src` (`https://user.github.io/<repo>/embed?...`); the "Edit on Flowgio"
badge follows the deployment base automatically.

## Security

Flowgio has no backend and makes no network requests; diagrams live in the
browser, and share links keep the diagram in the URL `#hash`, which is never
sent to a server. The security-relevant surface is untrusted input (DSL source,
share links, `.flowgio` files, `?source=`), so every entry point goes through
one validator and shared limits (`src/features/diagram/limits.ts`):

| Limit                      | Value           |
| -------------------------- | --------------- |
| DSL source                 | 300,000 chars   |
| Nodes / edges              | 3,000 / 6,000   |
| Label / identifier length  | 500 / 128 chars |
| Share payload (`#share=`)  | 2,000,000 chars |
| Imported `.flowgio` file | 5 MB            |

Labels are rendered as text (never `v-html`) and escaped in SVG export; a
Content-Security-Policy (no inline/`eval` scripts, same-origin workers) is
delivered via `<meta>` and checked by an end-to-end test against the production
build. CodeQL runs in CI, and
`npm audit` runs on every build. See [SECURITY.md](./SECURITY.md) for the threat
model, known limitations and how to report a vulnerability privately.

## Available scripts

| Script                            | What it does                                        |
| --------------------------------- | --------------------------------------------------- |
| `npm run dev`                     | Start the Vite dev server                           |
| `npm run build`                   | Typecheck, then build for production                |
| `npm run preview`                 | Preview a production build locally                  |
| `npm run typecheck`               | `vue-tsc` across the app, e2e, and config projects  |
| `npm run lint` / `lint:fix`       | ESLint                                              |
| `npm run format` / `format:check` | Prettier                                            |
| `npm run test:watch`              | Vitest, watch mode                                  |
| `npm run test:run`                | Vitest, single run (unit + integration)             |
| `npm run test:e2e`                | Playwright E2E suite (starts the dev server itself) |
| `npm run test:e2e:ui`             | Playwright's interactive UI mode                    |

## Testing

**Unit/integration** (Vitest, jsdom) cover the DSL parser, serializer,
auto-layout, edge routing, undo/redo history, IndexedDB repositories, the
editor store, and component-level interaction (drag, pan, zoom, keyboard).

```bash
npm run test:run
```

**End-to-end** (Playwright, real Chromium) cover the flows that only make
sense across the whole stack: typing a diagram and seeing it render, saving
and reloading, exporting, the share-link round trip, keyboard shortcuts, and
embed mode.

```bash
npx playwright install --with-deps chromium   # first time only
npm run test:e2e
```

Crash-recovery drafts are covered at the unit level only — the recovery flow
depends on catching a real interrupted save mid-flight, which is inherently
timing-based and not something to script reliably in browser automation.

## Performance

Edge routing has to avoid overlapping nodes. A naive router checks every
other node as a possible obstacle for every edge, so a full re-route pass
(what happens on every node-drag frame, since a moved node can change any
edge's path) is roughly O(nodes × edges). Flowgio avoids that in three
layers:

1. **Spatial index** (`obstacleIndex.ts`): nodes are bucketed into a uniform
   grid, and an edge only looks at nodes near the bounding box of its two
   endpoints. Back edges, which wrap around the whole diagram, still use every
   node. A test routes every edge of 60 random layouts both ways and requires
   identical results.
2. **Viewport culling** (`viewportCulling.ts`): only nodes and edges that touch
   the visible area (plus a margin) are mounted, so the DOM size and the work
   per drag frame follow what is on screen rather than the diagram size. The
   selected or dragged node always stays mounted. Until the canvas has been
   measured, everything renders.
3. Cheaper bookkeeping: node label wrapping is cached in a `computed`, and the
   undo history compares documents field by field instead of serialising both
   to JSON.

`npm run bench` measures a full re-route pass on synthetic diagrams with the
real routing code (index rebuild included; the culled column assumes a
1920×1080 viewport at zoom 1). One run on a development machine:

```
npm run bench

nodes=   25  edges=   27  full-scan=    2.96ms  indexed=    0.61ms  indexed+culled=    0.71ms  ok
nodes=   50  edges=   56  full-scan=    1.68ms  indexed=    0.60ms  indexed+culled=    0.47ms  ok
nodes=  100  edges=  113  full-scan=    5.26ms  indexed=    0.83ms  indexed+culled=    3.37ms  ok
nodes=  200  edges=  229  full-scan=   19.95ms  indexed=    2.69ms  indexed+culled=    1.84ms  ok
nodes=  400  edges=  459  full-scan=   61.62ms  indexed=    5.79ms  indexed+culled=    1.94ms  ok
nodes=  800  edges=  919  full-scan=  247.76ms  indexed=   10.44ms  indexed+culled=    3.96ms  ok
nodes= 1500  edges= 1724  full-scan= 1131.90ms  indexed=   23.04ms  indexed+culled=    6.09ms  ok
```

Absolute numbers depend on the machine (compare the columns, not the digits),
and the benchmark measures **routing only**. It does not include Vue's
reactivity cost or the browser's SVG layout and paint, which is why culling
matters beyond the routing numbers: it keeps the number of live SVG elements
small. Zooming far out on a very large diagram shows many nodes at once and
brings the cost back, since everything is then genuinely on screen.

Undo history keeps up to 100 steps, but each step is a full snapshot, so it
also has a memory budget (about 12 MB of serialised document across undo and
redo): small diagrams keep all 100 steps, a diagram at the input limits keeps
roughly ten. Edge ids are derived from the edge's endpoints and label, so
re-parsing unchanged text keeps the same ids and Vue does not recreate every
edge on each keystroke.

Remaining limits: parsing and layout run on the main thread. Re-parsing
3,000 nodes takes about 35 ms on a development machine (about 10 ms at 1,500),
and moving it to a Web Worker was measured and rejected: copying the document
to and from the worker costs about as much as the parse itself. Flowgio is built for diagrams you would draw by hand (architecture
diagrams, flowcharts, dozens to a few hundred nodes); input is capped at
3,000 nodes (see [Security](#security)).

## Project structure

```
src/
  app/                 # router, page-title helper
  components/
    canvas/            # DiagramCanvas, DiagramNode, NodeInspector (SVG canvas)
    editor/            # Monaco-based CodeEditor + DSL language definition
    layout/            # AppShell, header/nav chrome
    theme/             # ThemeSwitcher
  content/tutorials/   # built-in worked DSL examples
  features/
    diagram/           # parser, serializer, layout, edge routing, history, SVG export
    diagrams/          # saved-diagram persistence (IndexedDB)
    drafts/            # crash-recovery draft persistence
    file/              # .flowgio file format (import/export)
    share/             # URL-hash share codec
    storage/           # generic IndexedDB repository + database setup
    theme/             # Monaco theme definitions
    tutorials/         # tutorial registry
  pages/
    editor-page/       # composables that make up EditorPage (see below)
    *.vue              # HomePage, EditorPage, DiagramsPage, TutorialsPage,
                        # EmbedPage, NotFoundPage
  stores/
    editor/            # composables that make up the editor Pinia store
    editor.ts          # thin orchestration over stores/editor/*
    diagrams.ts, theme.ts
e2e/                   # Playwright specs
```

`stores/editor.ts` and `pages/EditorPage.vue` are both intentionally thin —
each composes small, single-purpose modules from `stores/editor/` and
`pages/editor-page/` respectively (state, viewport, parsing, history,
persistence, keyboard shortcuts, export, draft recovery, ...). See the
comments at the top of `stores/editor.ts` for the composition order and why
it's structured that way.

## License

[MIT](./LICENSE)
