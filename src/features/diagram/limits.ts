/*
 * Hard limits for everything that enters the app from outside the editor:
 * DSL source, share links, `.devcanvas` files and `?source=` query params.
 *
 * Diagrams are rendered synchronously on the main thread, so unbounded input
 * lets a single crafted link or file freeze the tab. The numbers are generous
 * for real diagrams (the README benchmark tops out at 1,500 nodes) and exist
 * only to stop pathological input.
 */
export const DIAGRAM_LIMITS = {
  /** Parse errors collected before the parser gives up. */
  maxParseErrors: 100,
  /** Characters of DSL source accepted by the parser. */
  maxSourceLength: 300_000,
  maxNodes: 3_000,
  maxEdges: 6_000,
  maxLabelLength: 500,
  maxTitleLength: 200,
  /** Node / edge ids and DSL identifiers. */
  maxIdLength: 128,
  /** Absolute value of a node coordinate. */
  maxCoordinate: 1_000_000,
  /** Width / height of a single node. */
  maxNodeSize: 5_000,
  /** Characters of the base64url payload in a `#share=` hash. */
  maxSharePayloadLength: 2_000_000,
  /** Bytes of an imported `.devcanvas` file. */
  maxFileBytes: 5 * 1024 * 1024,
} as const;
