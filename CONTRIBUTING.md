# Contributing to Flowgio

Thanks for taking a look at Flowgio. This is a solo-maintained project,
so the bar is less "formal process" and more "keep it consistent with
what's already here."

## Setup

Requires Node.js 20+ (see `engines` in `package.json`; `.nvmrc` pins the
exact version CI uses).

```bash
git clone https://github.com/sanya-shch/Flowgio.git
cd Flowgio
npm install
npm run dev
```

## Before opening a PR

Run the same checks CI runs, in this order — failing fast locally saves a
round trip through Actions:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm run test:e2e   # npx playwright install --with-deps chromium, first time only
```

`npm run lint:fix` and `npm run format` will fix most style issues
automatically.

## Guidelines

- **Tests are not optional for logic changes.** If you touch
  `features/diagram`, `features/share`, `features/storage`, or a store,
  add or update a test alongside the change — see the
  [Testing](README.md#testing) section of the README for what's unit- vs
  e2e-tested and why.
- **Match the existing patterns** rather than introducing a new one for
  the same problem — e.g. new storage code should go through
  `createIndexedDbRepository` (see `features/drafts` or `features/diagrams`
  for the shape), not a fresh IndexedDB wrapper.
- **Keep stores thin.** Business logic belongs in `features/`; a Pinia
  store should mostly compose and call into it (see the comment at the
  top of `stores/editor.ts` for the reasoning).
- **User-facing storage failures should be handled**, not left as an
  unhandled rejection — route them through
  `features/storage/storageError.ts` so the message is consistent.
- **Performance-sensitive changes** (anything touching `edgeRouter.ts` or
  `layout.ts`) should be checked against `npm run bench` — see the
  [Performance](README.md#performance) section for the current baseline.

## Reporting a bug

Open an issue with: what you did, what you expected, what happened
instead, and your browser. A minimal DSL snippet that reproduces it
(or a share link) helps a lot — see [The DSL](README.md#the-dsl) for the
syntax if you need a refresher.

## License

By contributing, you agree your contribution is licensed under this
project's [MIT License](LICENSE).
