import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

/*
 * GitHub Pages cannot send response headers, so the policy is delivered as a
 * <meta> tag. (frame-ancestors / report-uri are ignored in <meta>; embedding is
 * intentionally allowed anyway, see README "Embedding".)
 *
 * - style-src 'unsafe-inline': Vue style bindings and Monaco inject inline styles.
 * - worker-src 'self': Monaco's editor worker is emitted as a same-origin file.
 * - dev only: the HMR websocket needs ws:.
 */
function contentSecurityPolicy(): Plugin {
  const directives = (dev: boolean) => [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return {
    name: "devcanvas:csp",
    transformIndexHtml(html, ctx) {
      const policy = directives(Boolean(ctx.server)).join("; ");

      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  };
}

export default defineConfig(({ command }) => {
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

  const base = command === "build" && repoName ? `/${repoName}/` : "/";

  return {
    base,

    plugins: [vue(), contentSecurityPolicy()],

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@monaco": fileURLToPath(new URL("./node_modules/monaco-editor/esm/vs", import.meta.url)),
      },
    },
  };
});
