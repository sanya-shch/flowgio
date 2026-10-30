# Security Policy

## Supported versions

Flowgio is a client-side app deployed from `main`; only the latest deployed version is supported.

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Use GitHub's
[private vulnerability reporting](../../security/advisories/new) for this repository
(Security → Report a vulnerability). Include steps to reproduce and, if possible, a
minimal diagram, share link or `.flowgio` file that triggers the problem.

You can expect an initial response within a few days. This is a hobby project, so
there is no bug bounty, but valid reports are credited in the fix unless you prefer otherwise.

## Threat model

Flowgio has no backend, accounts or network requests. Everything stays in the
browser (IndexedDB), and share links keep the diagram in the URL `#hash`, which
browsers never send to a server. The interesting attack surface is therefore
**untrusted input**:

| Input                    | Where                  | Protection                                                                                    |
| ------------------------ | ---------------------- | --------------------------------------------------------------------------------------------- |
| DSL source               | editor, `?source=`     | Size, node, edge, label and identifier limits; error cap; labels rendered as text, never HTML |
| Share link (`#share=`)   | editor, `/embed`       | Payload size cap, alphabet check, schema + integrity validation, readable error on failure    |
| `.flowgio` file          | import                 | Size checked before reading, same validator as share links                                    |
| SVG / PNG export         | download               | All text XML-escaped, numbers validated as finite                                             |
| Embedded page (`/embed`) | third-party `<iframe>` | Read-only, never writes storage; embedders should use `sandbox` (see README)                  |

Limits live in `src/features/diagram/limits.ts`. A Content-Security-Policy is
delivered via `<meta>` (`vite.config.ts`): no inline or `eval`-ed scripts,
same-origin workers, `object-src 'none'`.

## Known limitations

- GitHub Pages cannot send response headers, so `frame-ancestors`, HSTS and
  `X-Content-Type-Options` cannot be set. Embedding is intentionally allowed.
- Monaco Editor ships its own copy of DOMPurify, which `npm audit` currently flags.
  Flowgio never passes untrusted markup or markdown to Monaco (no hover or
  completion providers; the editor only holds plain text). The advisory is tracked
  and the dependency is updated as soon as Monaco releases a fixed build.
- Hostile input is bounded, not free: a diagram at the size limits can still be slow
  to render on weak devices.
